import React from 'react';
import './AtprotoUserCard.css';

export enum UserCardVariant {
  PAYMENT = 'payment',
  PROFILE = 'profile'
}

interface AtprotoUserCardProps {
  name?: string;
  handle?: string;
  did?: string;
  avatar?: string;
  clickable?: boolean;
  onClick?: () => void;
  variant?: UserCardVariant;
  showDid?: boolean;
}

export const AtprotoUserCard: React.FC<AtprotoUserCardProps> = ({
  name,
  handle,
  did,
  avatar,
  clickable = false,
  onClick,
  variant = UserCardVariant.PAYMENT,
  showDid = false
}) => {
  const getDisplayInitial = () => {
    return (handle || name || '?').charAt(0).toUpperCase();
  };

  const handleClick = () => {
    if (clickable && onClick) {
      onClick();
    } else if (clickable && handle) {
      globalThis.open(`https://bsky.app/profile/${handle}`, '_blank');
    }
  };

  if (variant === UserCardVariant.PROFILE) {
    return (
      <div 
        className={`at-user-card ${variant} ${clickable ? 'clickable' : ''}`}
        onClick={handleClick}
        title={clickable && handle ? `View @${handle} on Bluesky` : undefined}
      >
        <div className="at-main-row">
          <div className="at-avatar-section">
            {avatar ? (
              <img 
                src={avatar} 
                alt={`${handle || name} avatar`}
                className="at-avatar"
              />
            ) : (
              <div className="at-avatar-placeholder">
                {getDisplayInitial()}
              </div>
            )}
          </div>
          <div className="at-details">
            {name && <div className="at-name">{name}</div>}
            {handle && <div className="at-handle">@{handle}</div>}
          </div>
        </div>
        {showDid && did && <div className="at-did">{did}</div>}
      </div>
    );
  }

  return (
    <div 
      className={`at-user-card ${variant} ${clickable ? 'clickable' : ''}`}
      onClick={handleClick}
      title={clickable && handle ? `View @${handle} on Bluesky` : undefined}
    >
      {avatar ? (
        <img 
          src={avatar} 
          alt={`${handle || name} avatar`}
          className="at-avatar"
        />
      ) : (
        <div className="at-avatar-placeholder">
          {getDisplayInitial()}
        </div>
      )}
      <div className="at-details">
        {name && <div className="at-name">{name}</div>}
        {handle && <div className="at-handle">@{handle}</div>}
        {showDid && did && <div className="at-did">{did}</div>}
      </div>
    </div>
  );
};
