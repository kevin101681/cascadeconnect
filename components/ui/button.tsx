import type { ComponentProps } from 'react';
import BaseButton from '../Button';

export type ButtonProps = ComponentProps<typeof BaseButton>;

export const Button = (props: ButtonProps) => <BaseButton {...props} />;

export default Button;

