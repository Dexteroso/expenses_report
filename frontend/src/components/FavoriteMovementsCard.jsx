import { useEffect, useState } from 'react';
import { lightTheme } from '../theme/theme';
import { authFetch } from '../utils/auth';
import { API_BASE_URL } from '../utils/api';
import { typography } from '../styles/typography';
import PrimaryButton from './ui/PrimaryButton';

function FavoriteMovementsCard({ refreshKey, onApplyFavorite, onCreateFavorite, onEditFavorite, isEditMode, onEditModeChange }) {
  const theme = lightTheme;
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    const fetchFavorites = async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/api/favorite-movements`);
        const data = await response.json();
        if (!active) return;
        if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los frecuentes.');
        setFavorites(Array.isArray(data) ? data : []);
        setMessage('');
      } catch (error) {
        if (active) setMessage(error.message || 'No se pudieron cargar los frecuentes.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    fetchFavorites();
    return () => { active = false; };
  }, [refreshKey]);

  const favoriteSlots = Array.from({ length: 6 }, (_, index) => favorites[index] || null);
  const firstEmptySlotIndex = favorites.length < 6 ? favorites.length : -1;

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
                      if (isEditMode) onEditFavorite(favorite);
                      else onApplyFavorite(favorite);
                    }}
                    aria-label={`${isEditMode ? 'Editar' : 'Usar'} movimiento frecuente ${favorite.alias}`}
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
                </>
              ) : (() => {
                const canCreateFavorite = index === firstEmptySlotIndex;

                return (
                <button
                  type="button"
                  className={`favorite-movement-slot favorite-movement-empty-slot ${canCreateFavorite ? '' : 'is-placeholder'}`}
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
          aria-pressed={isEditMode}
          onClick={() => onEditModeChange(!isEditMode)}
          disabled={isLoading || (favorites.length === 0 && !isEditMode)}
        >
          {isEditMode ? 'Cancelar' : 'Editar frecuentes'}
        </PrimaryButton>
      </div>

    </section>
  );
}

export default FavoriteMovementsCard;
