import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from '../../api/auth';
import { Spinner } from '../../components/ui/Spinner';

const schema = z.object({
  company_name: z.string().min(2, 'Company name required'),
  full_name: z.string().min(2, 'Your name required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
});
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const register_ = useRegister();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormValues) => {
    register_.mutate(data, { onSuccess: () => navigate('/app/dashboard') });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 items-center justify-center mb-4">
            <span className="text-white font-bold text-xl">H</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Create your account</h1>
          <p className="text-slate-400 text-sm mt-1">Start hiring smarter with HireFlow</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-5">
          {register_.isError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm px-3 py-2 rounded-lg">
              Registration failed. Email may already be in use.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {[
              { name: 'company_name' as const, label: 'Company name', type: 'text', placeholder: 'Acme Corp' },
              { name: 'full_name' as const, label: 'Your name', type: 'text', placeholder: 'Jane Smith' },
              { name: 'email' as const, label: 'Work email', type: 'email', placeholder: 'jane@acme.com' },
              { name: 'password' as const, label: 'Password', type: 'password', placeholder: '••••••••' },
            ].map(({ name, label, type, placeholder }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
                <input
                  {...register(name)}
                  type={type}
                  placeholder={placeholder}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                />
                {errors[name] && <p className="text-xs text-rose-400 mt-1">{errors[name]?.message}</p>}
              </div>
            ))}

            <button
              type="submit"
              disabled={register_.isPending}
              className="w-full flex justify-center items-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors disabled:opacity-60"
            >
              {register_.isPending ? <Spinner size="sm" /> : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
