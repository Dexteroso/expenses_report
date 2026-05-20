import { useEffect, useState } from 'react';
import { lightTheme } from '../theme/theme';
import { authFetch } from '../utils/auth';
import { API_BASE_URL } from '../utils/api';
import { typography } from '../styles/typography';
import PrimaryButton from './ui/PrimaryButton';

function FavoriteMovementsCard({ refreshKey, onApplyFavorite, onCreateFavorite, selectedSlotIndex = null }) {
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

  const favoriteSlots = Array.from({ length: 6 }, (_, index) => favorites[index] || null);
  const firstEmptySlotIndex = favorites.length < 6 ? favorites.length : -1;
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
      <div className="favorite-movements-header">
        <div className="movements-card-title-row">
          <span className="movements-card-title-icon favorite-title-icon" aria-hidden="true">
            <i className="bx bx-star"></i>
          </span>
          <h2 className="favorite-movements-title" style={{ ...typography.sectionTitle, margin: 0 }}>
            Movimientos frecuentes
          </h2>
        </div>
      </div>

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
                <>
                  <button
                    type="button"
                    className="favorite-movement-slot"
                    onClick={() => {
                      if (!isEditMode) {
                        onApplyFavorite(favorite);
                      }
                    }}
                    aria-label={`Usar movimiento frecuente ${favorite.alias}`}
                    style={{
                      color: favorite.color,
                      '--favorite-color': favorite.color,
                    }}
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
                  {isEditMode && (
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
                </>
              ) : (() => {
                const canCreateFavorite = index === firstEmptySlotIndex;

                return (
                <button
                  type="button"
                  className={`favorite-movement-slot favorite-movement-empty-slot ${canCreateFavorite ? '' : 'is-placeholder'} ${selectedSlotIndex === index ? 'is-selected' : ''}`}
                  onClick={() => {
                    if (canCreateFavorite) {
                      onCreateFavorite(index);
                    }
                  }}
                  disabled={!canCreateFavorite}
                  aria-label={canCreateFavorite ? 'Agregar movimiento frecuente' : 'Espacio disponible'}
                >
                  <span className="favorite-movement-button favorite-movement-add">
                    <i className="bx bx-plus"></i>
                  </span>
                  <span className="favorite-movement-alias favorite-movement-add-label">
                    {index === firstEmptySlotIndex ? 'Agregar' : '\u00A0'}
                  </span>
                </button>
                );
              })()}
            </div>
          ))
        )}
      </div>

      <div className="favorite-movements-actions">
        <PrimaryButton
          type="button"
          variant="secondary"
          className="favorite-edit-toggle"
          onClick={() => setIsEditMode((prev) => !prev)}
          disabled={isLoading || favorites.length === 0}
        >
          {isEditMode ? 'Listo' : 'Editar frecuentes'}
        </PrimaryButton>
      </div>

      {favoriteToDelete && (
        <div className="favorite-delete-overlay" role="dialog" aria-modal="true">
          <div className="favorite-delete-modal">
            <p className="favorite-delete-message">
              Eliminar “{deleteAlias}” de frecuentes?
            </p>
            <div className="favorite-delete-actions">
              <PrimaryButton
                type="button"
                variant="danger"
                onClick={handleDelete}
              >
                Eliminar
              </PrimaryButton>
              <PrimaryButton
                type="button"
                variant="secondary"
                onClick={() => setFavoriteToDelete(null)}
              >
                Cancelar
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default FavoriteMovementsCard;
