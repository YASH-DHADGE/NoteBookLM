import { forwardRef } from 'react';
import './Button.css';

const Button = forwardRef(
    (
        {
            children,
            variant = 'primary',
            size = 'md',
            isLoading = false,
            disabled = false,
            fullWidth = false,
            type = 'button',
            leftIcon,
            rightIcon,
            className = '',
            ...props
        },
        ref
    ) => {
        const classes = [
            'button',
            `button-${variant}`,
            `button-${size}`,
            fullWidth && 'button-full',
            isLoading && 'button-loading',
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <button
                ref={ref}
                type={type}
                className={classes}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <span className="button-spinner" />
                ) : (
                    <>
                        {leftIcon && <span className="button-icon">{leftIcon}</span>}
                        {children}
                        {rightIcon && <span className="button-icon">{rightIcon}</span>}
                    </>
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
