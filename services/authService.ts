import { Homeowner, InternalEmployee, UserRole } from '../types';
import { MOCK_HOMEOWNERS, MOCK_INTERNAL_EMPLOYEES } from '../constants';

// This service mocks the interaction with a real Auth Provider (e.g., Netlify Identity / Neon)

interface AuthResponse {
  success: boolean;
  user?: Homeowner | InternalEmployee;
  role?: UserRole;
  error?: string;
}

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // 1. Check Internal Employees
  const employee = MOCK_INTERNAL_EMPLOYEES.find(e => e.email.toLowerCase() === email.toLowerCase());
  if (employee) {
    // In a real app, verify password hash here
    if (password === 'password') {
      return { success: true, user: employee, role: UserRole.ADMIN };
    } else {
      return { success: false, error: 'Invalid password. (Try "password")' };
    }
  }

  // 2. Check Homeowners
  const homeowner = MOCK_HOMEOWNERS.find(h => h.email.toLowerCase() === email.toLowerCase());
  if (homeowner) {
    if (password === 'password') {
      return { success: true, user: homeowner, role: UserRole.HOMEOWNER };
    } else {
      return { success: false, error: 'Invalid password. (Try "password")' };
    }
  }

  return { success: false, error: 'User not found.' };
};

export const socialLogin = async (provider: 'google' | 'apple'): Promise<AuthResponse> => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Simulate successful social login mapping to the first Admin account for demo
  const employee = MOCK_INTERNAL_EMPLOYEES[0];
  return { success: true, user: employee, role: UserRole.ADMIN };
};

export const register = async (email: string, password: string, name: string): Promise<AuthResponse> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate creating a new homeowner account
  const newHomeowner: Homeowner = {
    id: `h-new-${Date.now()}`,
    name: name,
    email: email,
    phone: '',
    address: 'Pending Assignment',
    builder: 'Pending',
    lotNumber: 'Pending',
    closingDate: new Date()
  };
  
  return { success: true, user: newHomeowner, role: UserRole.HOMEOWNER };
};