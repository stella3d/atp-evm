import React from 'react';

interface AtUriLinkProps {
	atUri: `at://${string}`;
}

const AtUriLink: React.FC<AtUriLinkProps> = ({ atUri }) => {
	const linkUrl = `https://pdsls.dev/${atUri}`;
	return (
		<a href={linkUrl} target="_blank" rel="noopener noreferrer">
			view written record on PDSls
		</a>
	);
};

export default AtUriLink;
