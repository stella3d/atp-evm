import React from 'react';
import { JSX } from "react/jsx-runtime";

interface AtUriLinkProps {
	atUri: `at://${string}`;
	caption: string;
	color?: string;
	fontWeight?: number;
	wrapperTag?: keyof JSX.IntrinsicElements;
	// Optional class name for custom styling
	className?: string;
}

	const AtUriLink: React.FC<AtUriLinkProps> = ({ atUri, caption, color, fontWeight, wrapperTag: Wrapper = 'p', className }) => {
	const linkUrl = `https://pdsls.dev/${atUri}`;
	return (
		<Wrapper className={className}>
			<a href={linkUrl} target="_blank" rel="noopener noreferrer" style={{ color, fontWeight }}>
				{caption}
			</a>
		</Wrapper>
	);
};

export default AtUriLink;
