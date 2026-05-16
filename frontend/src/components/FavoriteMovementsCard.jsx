import { useEffect, useState } from 'react';
import { lightTheme } from '../theme/theme';
import { authFetch } from '../utils/auth';
import { API_BASE_URL } from '../utils/api';
import { typography } from '../styles/typography';

function FavoriteMovementsCard({ refreshKey, onApplyFavorite, onCreateFavorite }) {
  const theme = lightTheme;
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [favoriteToDelete, setFavoriteToDelete] = useState(null);

  const fetchFavorites = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const response = await authFetch(`${API_BASE_URL}/api/favorite-movements`);
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || 'No se pudieron cargar los frecuentes.');
        return;
      }

      setFavorites(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage('No se pudieron cargar los frecuentes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [refreshKey]);

  const handleDelete = async () => {
    if (!favoriteToDelete) return;

    try {
      const response = await authFetch(`${API_BASE_URL}/api/favorite-movements/${favoriteToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setMessage(data.error || 'No se pudo eliminar el frecuente.');
        return;
      }

      setFavoriteToDelete(null);
      await fetchFavorites();
    } catch (error) {
      console.error(error);
      setMessage('No se pudo eliminar el frecuente.');
    }
  };

  const favoriteSlots = Array.from({ length: 5 }, (_, index) => favorites[index] || null);
  const firstEmptySlotIndex = favorites.length < 5 ? favorites.length : -1;
  const deleteAlias = favoriteToDelete?.alias || 'este frecuente';

  return (
    <section
      className="responsive-card favorite-movements-card"
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        padding: 16,
        boxShadow: theme.shadow,
        marginBottom: 20,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <h2 className="favorite-movements-title" style={{ ...typography.sectionTitle, marginTop: 0, marginBottom: 20 }}>
        Movimientos Frecuentes
      </h2>

      {message && (
        <p style={{ marginTop: 0, marginBottom: 10, color: '#b91c1c', fontSize: 12, fontWeight: 700 }}>
          {message}
        </p>
      )}

      <div className="favorite-movements-list" aria-label="Movimientos frecuentes">
        {isLoading ? (
          <span style={{ color: theme.textSecondary, fontSize: 12 }}>Cargando frecuentes...</span>
        ) : (
          favoriteSlots.map((favorite, index) => (
            <div className="favorite-movement-item" key={favorite?.id || `empty-${index}`}>
              {favorite ? (
                <button
                  type="button"
                  className="favorite-movement-slot"
                  onClick={() => {
                    if (!isEditMode) {
                      onApplyFavorite(favorite);
                    }
                  }}
                  aria-label={`Usar movimiento frecuente ${favorite.alias}`}
                  style={{ color: favorite.color }}
                >
                  <span
                    className="favorite-movement-button"
                    style={{
                      background: favorite.color,
                      borderColor: favorite.color,
                    }}
                  >
                    <span>{favorite.emoji}</span>
                  </span>
                  <span className="favorite-movement-alias">
                    {favorite.alias}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className="favorite-movement-slot favorite-movement-empty-slot"
                  onClick={onCreateFavorite}
                  aria-label="Agregar movimiento frecuente"
                >
                  <span className="favorite-movement-button favorite-movement-add">
                    <i className="bx bx-plus"></i>
                  </span>
                  <span className="favorite-movement-alias favorite-movement-add-label">
                    {index === firstEmptySlotIndex ? 'Agregar' : '\u00A0'}
                  </span>
                </button>
              )}
              {favorite && isEditMode && (
                <button
                  type="button"
                  className="favorite-movement-delete"
                  onClick={(event) => {
                    event.stopPropagation();
                    setFavoriteToDelete(favorite);
                  }}
                  aria-label={`Eliminar movimiento frecuente ${favorite.alias}`}
                  title="Eliminar frecuente"
                >
                  <i className="bx bx-x"></i>
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="favorite-movements-actions">
        <button
          type="button"
          className="favorite-edit-toggle"
          onClick={() => setIsEditMode((prev) => !prev)}
          disabled={isLoading || favorites.length === 0}
        >
          {isEditMode ? 'Listo' : 'Editar frecuentes'}
        </button>
      </div>

      {favoriteToDelete && (
        <div className="favorite-delete-overlay" role="dialog" aria-modal="true">
          <div className="favorite-delete-modal">
            <p className="favorite-delete-message">
              Eliminar “{deleteAlias}” de frecuentes?
            </p>
            <div className="favorite-delete-actions">
              <button
                type="button"
                className="favorite-delete-cancel"
                onClick={() => setFavoriteToDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="favorite-delete-confirm"
                onClick={handleDelete}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default FavoriteMovementsCard;
