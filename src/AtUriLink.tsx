import React from 'react';

interface AtUriLinkProps {
	atUri: `at://${string}`;
	caption: string;
}

const AtUriLink: React.FC<AtUriLinkProps> = ({ atUri, caption }) => {
	const linkUrl = `https://pdsls.dev/${atUri}`;
	return (
		<p>
			<a href={linkUrl} target="_blank" rel="noopener noreferrer">
				{caption}
			</a>
		</p>
	);
};

export default AtUriLink;
