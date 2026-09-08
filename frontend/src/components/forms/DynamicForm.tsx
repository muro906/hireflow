import { useForm as useHookForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FormSchema } from '../../types';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface DynamicFormProps {
  schema: FormSchema;
  onSubmit: (data: Record<string, unknown>) => void;
  isLoading?: boolean;
}

export function DynamicForm({ schema, onSubmit, isLoading }: DynamicFormProps) {
  // Build Zod schema dynamically
  const zodSchemaShape: Record<string, z.ZodTypeAny> = {
    full_name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    cv: z.any().refine((file) => file instanceof File, 'CV is required'),
  };

  schema.fields.forEach((field) => {
    let fieldSchema: z.ZodTypeAny = z.string();
    if (field.type === 'number') {
      fieldSchema = z.string().regex(/^\d+$/, 'Must be a number').transform(Number);
    } else if (field.type === 'email') {
      fieldSchema = z.string().email('Invalid email address');
    } else if (field.type === 'url') {
      fieldSchema = z.string().url('Invalid URL').or(z.literal(''));
    }

    if (field.required) {
      fieldSchema = (fieldSchema as z.ZodString).min(1, 'This field is required');
    } else {
      fieldSchema = fieldSchema.optional();
    }

    zodSchemaShape[field.id] = fieldSchema;
  });

  const formSchema = z.object(zodSchemaShape);
  type FormData = z.infer<typeof formSchema>;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useHookForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">Full Name <span className="text-rose-500">*</span></label>
          <Input {...register('full_name')} placeholder="Jane Doe" />
          {errors.full_name && <p className="mt-1 text-sm text-rose-500">{errors.full_name.message as string}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">Email <span className="text-rose-500">*</span></label>
          <Input type="email" {...register('email')} placeholder="jane@example.com" />
          {errors.email && <p className="mt-1 text-sm text-rose-500">{errors.email.message as string}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">Phone Number</label>
          <Input type="tel" {...register('phone')} placeholder="+1 (555) 000-0000" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">Resume / CV <span className="text-rose-500">*</span></label>
          <Controller
            control={control}
            name="cv"
            render={({ field: { onChange, onBlur, name, ref } }) => (
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  onChange(file);
                }}
                onBlur={onBlur}
                name={name}
                ref={ref}
                className="text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-500/10 file:text-brand-500 hover:file:bg-brand-500/20"
              />
            )}
          />
          {errors.cv && <p className="mt-1 text-sm text-rose-500">{errors.cv.message as string}</p>}
        </div>

        {/* Dynamic Fields */}
        {schema.fields.map((field) => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-slate-200 mb-1">
              {field.label} {field.required && <span className="text-rose-500">*</span>}
            </label>
            
            {field.type === 'textarea' ? (
              <Textarea {...register(field.id)} />
            ) : field.type === 'select' ? (
              <Select 
                {...register(field.id)} 
                options={field.options?.map(o => ({ label: o, value: o })) || []} 
              />
            ) : (
              <Input 
                type={field.type === 'number' ? 'text' : field.type} 
                {...register(field.id)} 
              />
            )}
            
            {errors[field.id] && <p className="mt-1 text-sm text-rose-500">{errors[field.id]?.message as string}</p>}
          </div>
        ))}
      </div>

      <Button type="submit" isLoading={isLoading} fullWidth>
        Submit Application
      </Button>
    </form>
  );
}
