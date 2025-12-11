
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
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // This is a mock function, it won't work perfectly without real users loaded for social mapping
  // We'll just return a generic error or success for demo purposes if needed
  return { success: false, error: 'Social Login requires backend integration.' };
};

export const register = async (email: string, password: string, name: string): Promise<AuthResponse> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // In a real app this would call DB insert
  // Here we just return success and let UI optimistically update
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
