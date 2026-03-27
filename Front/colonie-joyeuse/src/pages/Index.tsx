import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/pages/LoginPage';
import ParentLayout from '@/layouts/ParentLayout';
import AdminLayout from '@/layouts/AdminLayout';
import ForcePasswordChange from '@/pages/ForcePasswordChange';
import ForgotPassword from '@/pages/ForgotPassword';

interface Props {
  page?: string;
}

const Index = ({ page }: Props) => {
  const { role, authStep } = useAuth();

  if (authStep === 'force_password_change') return <ForcePasswordChange />;
  if (authStep === 'forgot_password') return <ForgotPassword />;
  if (!role || authStep === 'logged_out') return <LoginPage />;
  if (role === 'parent') return <ParentLayout initialPage={page} />;
  return <AdminLayout initialPage={page} />;
};

export default Index;
