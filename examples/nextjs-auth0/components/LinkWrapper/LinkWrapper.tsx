import React, { forwardRef, ReactNode, useCallback } from 'react';
import Link, { LinkProps } from 'next/link';

export type LinkWrapperProps = {
  href: string;
  children: ReactNode;
  linkType?: 'button' | 'anchor';
  className?: string;
  onClick?: React.MouseEventHandler;
} & Pick<LinkProps, 'as'>;

// eslint-disable-next-line react/display-name
export const AnchorLinkWrapper = forwardRef<HTMLDivElement, LinkWrapperProps>(
  (props, ref): JSX.Element => (
    <div ref={ref}>
      <a {...props} />
    </div>
  ),
);

export function LinkWrapper({ className, as, onClick, ...props }: LinkWrapperProps): JSX.Element {
  let clickHandler = useCallback(
    (e: React.MouseEvent<HTMLElement>) => onClick?.(e),[onClick]
  );
  return (
    <Link href={props.href} as={as} passHref>
      <AnchorLinkWrapper onClick={clickHandler} {...props} className={className}/>
    </Link>
  );
}
