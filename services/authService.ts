
import { Homeowner, InternalEmployee, BuilderUser, UserRole } from '../types';

interface AuthResponse {
  success: boolean;
  user?: Homeowner | InternalEmployee | BuilderUser;
  role?: UserRole;
  error?: string;
}

export const login = async (
  email: string, 
  password: string,
  homeowners: Homeowner[],
  employees: InternalEmployee[],
  builderUsers: BuilderUser[]
): Promise<AuthResponse> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // 1. Check Internal Employees
  const employee = employees.find(e => e.email.toLowerCase() === email.toLowerCase());
  if (employee) {
    if (employee.password === password || (!employee.password && password === 'password')) {
      return { success: true, user: employee, role: UserRole.ADMIN };
    } else {
      return { success: false, error: 'Invalid password.' };
    }
  }

  // 2. Check Builder Users
  const builderUser = builderUsers.find(b => b.email.toLowerCase() === email.toLowerCase());
  if (builderUser) {
    if (builderUser.password === password || (!builderUser.password && password === 'password')) {
      return { success: true, user: builderUser, role: UserRole.BUILDER };
    } else {
      return { success: false, error: 'Invalid password.' };
    }
  }

  // 3. Check Homeowners
  const homeowner = homeowners.find(h => h.email.toLowerCase() === email.toLowerCase());
  if (homeowner) {
    if (homeowner.password === password || (!homeowner.password && password === 'password')) {
      return { success: true, user: homeowner, role: UserRole.HOMEOWNER };
    } else {
      return { success: false, error: 'Invalid password.' };
    }
  }

  return { success: false, error: 'User not found.' };
};

export const socialLogin = async (provider: 'google' | 'apple'): Promise<AuthResponse> => {
  // In a real production app, this would integrate with an OAuth provider like Clerk, Firebase, or Auth0.
  // Example for Clerk:
  // const { openSignIn } = useClerk();
  // openSignIn({ strategy: "oauth_google" });
  
  // For this application prototype, we simulate a successful OAuth response.
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const mockUser: Homeowner = {
    id: `${provider}-user-${Date.now()}`,
    name: provider === 'google' ? 'Google User' : 'Apple User',
    email: provider === 'google' ? 'demo.user@gmail.com' : 'demo.user@icloud.com',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    address: 'Address Pending Update',
    builder: 'Pending Assignment',
    jobName: 'New Registration',
    closingDate: new Date(),
    password: '' // OAuth users don't have a local password
  };

  return { success: true, user: mockUser, role: UserRole.HOMEOWNER };
};

export const register = async (email: string, password: string, name: string): Promise<AuthResponse> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  // Registration logic (omitted for brevity, assume success in demo)
  const newHomeowner: Homeowner = {
    id: `h-new-${Date.now()}`,
    name: name,
    email: email,
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    address: 'Pending Assignment',
    builder: 'Pending',
    jobName: 'Pending',
    closingDate: new Date(),
    password: password
  };
  return { success: true, user: newHomeowner, role: UserRole.HOMEOWNER };
};
