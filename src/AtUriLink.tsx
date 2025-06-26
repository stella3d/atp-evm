import React from 'react';

interface AtUriLinkProps {
	atUri: `at://${string}`;
}

const AtUriLink: React.FC<AtUriLinkProps> = ({ atUri }) => {
	const linkUrl = `https://pdsls.dev/${atUri}`;
	return (
		<p>
			<a href={linkUrl} target="_blank" rel="noopener noreferrer">
				view written record on PDSls
			</a>
		</p>
	);
};

export default AtUriLink;
