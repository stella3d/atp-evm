import React from 'react';
import type { EnrichedUser } from "../../shared/common.ts";

interface ProfileDetailsProps {
  user: EnrichedUser;
}

const linkifyText = (text: string): React.ReactNode[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const handleRegex = /(\s@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/g;
  // Combined regex to split by both URLs and handles
  const combinedRegex = /(https?:\/\/[^\s]+|\s@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/g;

  return text.split(combinedRegex).map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#1d9bf0',
            textDecoration: 'underline',
          }}
        >
          {part}
        </a>
      );
    } else if (part.match(handleRegex)) {
      // Remove the space and @ symbol for the URL but keep them in the display text
      const handleWithoutSpaceAndAt = part.trim().substring(1);
      return (
        <span key={index}>
          {part.charAt(0)}
          <a
            href={`https://bsky.app/profile/${handleWithoutSpaceAndAt}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#1d9bf0',
              textDecoration: 'underline',
            }}
          >
            {part.trim()}
          </a>
        </span>
      );
    }
    return part;
  });
};

export const ProfileDetails: React.FC<ProfileDetailsProps> = ({ user }) => {
  return (
    <div className="profile-details">
      {(user.createdAt || user.followersCount !== undefined || user.postsCount !== undefined) && (
        <div className="profile-stats">
          <div className="stats-grid">
            {user.createdAt && (
              <div className="stat-item">
                <span className="stat-label">Joined:</span>
                <span className="stat-value">
                  {(() => {
                    try {
                      const date = user.createdAt instanceof Date 
                        ? user.createdAt 
                        : new Date(user.createdAt);
                      return date.toLocaleDateString();
                    } catch {
                      return 'Unknown';
                    }
                  })()}
                </span>
              </div>
            )}
            {user.followersCount !== undefined && (
              <div className="stat-item">
                <span className="stat-label">Followers:</span>
                <span className="stat-value">{user.followersCount.toLocaleString()}</span>
              </div>
            )}
            {user.postsCount !== undefined && (
              <div className="stat-item">
                <span className="stat-label">Posts:</span>
                <span className="stat-value">{user.postsCount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}
      {user.description && (
        <div className="profile-description">
          {user.description.split('\n').map((line, index) => (
            <p key={index}>{linkifyText(line)}</p>
          ))}
        </div>
      )}
    </div>
  );
};
