import { forwardRef, useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import './Input.css';

const Input = forwardRef(
    (
        {
            label,
            error,
            type = 'text',
            icon,
            className = '',
            ...props
        },
        ref
    ) => {
        const [showPassword, setShowPassword] = useState(false);
        const isPasswordType = type === 'password';
        const inputType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

        return (
            <div className={`input-wrapper ${className}`}>
                {label && <label className="input-label">{label}</label>}
                <div className="input-container">
                    {icon && <span className="input-icon input-icon-left">{icon}</span>}
                    <input
                        ref={ref}
                        type={inputType}
                        className={`input-field ${error ? 'input-error' : ''} ${icon ? 'has-left-icon' : ''} ${isPasswordType ? 'has-right-icon' : ''}`}
                        {...props}
                    />
                    {isPasswordType && (
                        <button
                            type="button"
                            className="input-icon input-icon-right input-toggle-password"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                        >
                            {showPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                    )}
                </div>
                {error && <span className="input-error-message">{error}</span>}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;
