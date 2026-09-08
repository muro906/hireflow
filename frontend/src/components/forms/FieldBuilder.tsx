import { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FormField, FieldType } from '../../types';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

const FIELD_TYPES: { type: FieldType; label: string }[] = [
  { type: 'text', label: 'Short Text' },
  { type: 'textarea', label: 'Long Text' },
  { type: 'number', label: 'Number' },
  { type: 'email', label: 'Email' },
  { type: 'url', label: 'URL' },
  { type: 'select', label: 'Dropdown' },
  { type: 'checkbox', label: 'Checkbox' },
  { type: 'date', label: 'Date' },
  { type: 'file', label: 'File Upload' },
];

function SortableFieldItem({ field, onUpdate, onRemove }: { field: FormField; onUpdate: (id: string, data: Partial<FormField>) => void; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex gap-4 group">
      <div {...attributes} {...listeners} className="cursor-grab text-slate-500 hover:text-slate-300 mt-2">
        <GripVertical className="h-5 w-5" />
      </div>
      <div className="flex-1 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 w-full max-w-md">
            <label className="text-xs text-slate-400">Field Label</label>
            <Input 
              value={field.label} 
              onChange={(e) => onUpdate(field.id, { label: e.target.value })}
              placeholder="E.g., What is your experience?"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Type</label>
              <Select
                value={field.type}
                options={FIELD_TYPES.map(t => ({ value: t.type, label: t.label }))}
                onChange={(e) => {
                  const type = e.target.value as FieldType;
                  onUpdate(field.id, {
                    type,
                    options: type === 'select' ? field.options ?? ['Option 1'] : undefined,
                  });
                }}
                className="h-9 w-40"
              />
            </div>
            <button
              type="button"
              onClick={() => onRemove(field.id)}
              aria-label="Remove field"
              className="text-slate-500 hover:text-rose-500 p-1 mt-5"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <label className="flex items-center gap-2 text-slate-300">
            <input 
              type="checkbox" 
              checked={field.required}
              onChange={(e) => onUpdate(field.id, { required: e.target.checked })}
              className="rounded border-slate-700 bg-slate-900/50 text-brand-500 focus:ring-brand-500"
            />
            Required field
          </label>
        </div>

        {field.type === 'select' && (
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Options (comma-separated)</label>
            <Input 
              value={field.options?.join(', ') || ''} 
              onChange={(e) => onUpdate(field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              placeholder="Option 1, Option 2, Option 3"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function FieldBuilder({ initialFields = [], onChange }: { initialFields?: FormField[]; onChange?: (fields: FormField[]) => void }) {
  const [fields, setFields] = useState<FormField[]>(initialFields);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        const newFields = arrayMove(items, oldIndex, newIndex);
        onChange?.(newFields);
        return newFields;
      });
    }
  };

  const addField = (type: FieldType) => {
    const newField: FormField = {
      id: Math.random().toString(36).substring(7),
      label: 'New Field',
      type,
      required: false,
      options: type === 'select' ? ['Option 1'] : undefined
    };
    const newFields = [...fields, newField];
    setFields(newFields);
    onChange?.(newFields);
  };

  const updateField = (id: string, data: Partial<FormField>) => {
    const newFields = fields.map(f => f.id === id ? { ...f, ...data } : f);
    setFields(newFields);
    onChange?.(newFields);
  };

  const removeField = (id: string) => {
    const newFields = fields.filter(f => f.id !== id);
    setFields(newFields);
    onChange?.(newFields);
  };

  return (
    <div className="flex gap-6 h-[600px]">
      {/* Palette */}
      <div className="w-64 flex-shrink-0 bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col">
        <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-500" /> Add Fields
        </h3>
        <div className="space-y-2 overflow-y-auto">
          {FIELD_TYPES.map((ft) => (
            <button
              key={ft.type}
              type="button"
              onClick={() => addField(ft.type)}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900 hover:border-brand-500/50 hover:bg-brand-500/10 transition-colors text-left text-sm text-slate-300"
            >
              {ft.label}
              <Plus className="h-4 w-4 opacity-50" />
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-slate-900/30 border border-slate-800 rounded-xl p-6 overflow-y-auto">
        <div className="mb-6 pb-4 border-b border-slate-800">
          <h3 className="font-semibold text-slate-200">Form Fields</h3>
          <p className="text-sm text-slate-400">Drag to reorder. Name, email, phone and CV are collected automatically.</p>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {fields.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl text-slate-500">
                  Click a field type on the left to add it to your form.
                </div>
              ) : (
                fields.map(field => (
                  <SortableFieldItem 
                    key={field.id} 
                    field={field} 
                    onUpdate={updateField} 
                    onRemove={removeField} 
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
