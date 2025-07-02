import React from 'react';
import './AtprotoUserCard.css';

interface AtprotoUserCardProps {
  name?: string;
  handle?: string;
  did?: string;
  avatar?: string;
  clickable?: boolean;
  onClick?: () => void;
  variant?: 'payment' | 'profile';
  showDid?: boolean;
}

export const AtprotoUserCard: React.FC<AtprotoUserCardProps> = ({
  name,
  handle,
  did,
  avatar,
  clickable = false,
  onClick,
  variant = 'payment',
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

  return (
    <div 
      className={`atproto-user-card ${variant} ${clickable ? 'clickable' : ''}`}
      onClick={handleClick}
      title={clickable && handle ? `View @${handle} on Bluesky` : undefined}
    >
      {avatar ? (
        <img 
          src={avatar} 
          alt={`${handle || name} avatar`}
          className="atproto-avatar"
        />
      ) : (
        <div className="atproto-avatar-placeholder">
          {getDisplayInitial()}
        </div>
      )}
      <div className="atproto-details">
        {name && <div className="atproto-name">{name}</div>}
        {handle && <div className="atproto-handle">@{handle}</div>}
        {showDid && did && <div className="atproto-did">{did}</div>}
      </div>
    </div>
  );
};
