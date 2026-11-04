import { forwardRef, useId, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { fieldError, fieldRule, type FieldPolicy } from '@/lib/field-validation';

type InputProps = InputHTMLAttributes<HTMLInputElement> & { policy?: FieldPolicy };
export const CmsInput = forwardRef<HTMLInputElement, InputProps>(function CmsInput({ policy, type = 'text', onChange, onBlur, onInvalid, onCompositionEnd, ...props }, ref) {
    const id = useId();
    const [error, setError] = useState('');
    const handled = !props.readOnly && ['text', 'number', 'email', 'tel', 'url', 'search'].includes(type);
    const selected = policy ?? (type === 'number' ? 'integer' : type === 'email' ? 'email' : 'text');
    const rule = fieldRule(selected);
    const numeric = type === 'number';
    const check = (value: string) => {
        const message = fieldError(selected, value);
        if (message || !numeric || value === '') return message;
        if (props.min !== undefined && Number(value) < Number(props.min)) return `Nilai minimal ${props.min}.`;
        if (props.max !== undefined && Number(value) > Number(props.max)) return `Nilai maksimal ${props.max}.`;
        return '';
    };
    if (!handled) return <input {...props} ref={ref} type={type} onChange={onChange} onBlur={onBlur} onInvalid={onInvalid} onCompositionEnd={onCompositionEnd} />;
    const value = typeof props.value === 'number' && !Number.isFinite(props.value) ? '' : props.value;
    return <><input {...props} ref={ref} type={numeric ? 'text' : type} value={value}
        inputMode={props.inputMode ?? rule.inputMode} maxLength={props.maxLength ?? rule.max}
        aria-invalid={Boolean(error) || props['aria-invalid']} aria-describedby={[props['aria-describedby'], error ? id : ''].filter(Boolean).join(' ') || undefined}
        onChange={event => {
            if ((event.nativeEvent as InputEvent).isComposing) { onChange?.(event); return; }
            const rejected = fieldError(selected, event.target.value, true);
            if (rejected) { setError(rejected); event.target.setCustomValidity(check(String(value ?? ''))); return; }
            event.target.setCustomValidity(check(event.target.value));
            setError('');
            onChange?.(event);
        }}
        onBlur={event => { const message = check(event.target.value); event.target.setCustomValidity(message); setError(message); onBlur?.(event); }}
        onInvalid={event => { setError(check(event.currentTarget.value) || event.currentTarget.validationMessage); onInvalid?.(event); }}
        onCompositionEnd={event => { const message = check(event.currentTarget.value); event.currentTarget.setCustomValidity(message); setError(message); onCompositionEnd?.(event); }}
    />{error && <span id={id} role="alert" className="block mt-1 text-xs text-red-700">{error}</span>}</>;
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { policy?: FieldPolicy };
export const CmsTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function CmsTextarea({ policy = 'text', onChange, onBlur, ...props }, ref) {
    const id = useId();
    const [error, setError] = useState('');
    return <><textarea {...props} ref={ref} maxLength={props.maxLength ?? fieldRule(policy).max}
        aria-invalid={Boolean(error) || props['aria-invalid']} aria-describedby={[props['aria-describedby'], error ? id : ''].filter(Boolean).join(' ') || undefined}
        onChange={event => {
            if ((event.nativeEvent as InputEvent).isComposing) { onChange?.(event); return; }
            const rejected = fieldError(policy, event.target.value, true);
            if (rejected) { setError(rejected); event.target.setCustomValidity(fieldError(policy, props.value ?? '')); return; }
            event.target.setCustomValidity(fieldError(policy, event.target.value)); setError(''); onChange?.(event);
        }}
        onBlur={event => { const message = fieldError(policy, event.target.value); event.target.setCustomValidity(message); setError(message); onBlur?.(event); }}
    />{error && <span id={id} role="alert" className="block mt-1 text-xs text-red-700">{error}</span>}</>;
});
