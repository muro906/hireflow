import { useState, useMemo } from 'react';
import { PipelineData } from '../../types';
import { KanbanColumn } from './KanbanColumn';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CandidateCard } from './CandidateCard';
import { useMoveApplication } from '../../api/applications';

interface KanbanBoardProps {
  jobId: string;
  initialData: PipelineData;
}

export function KanbanBoard({ jobId, initialData }: KanbanBoardProps) {
  const [data, setData] = useState<PipelineData>(initialData);
  const [activeId, setActiveId] = useState<string | null>(null);

  const moveMutation = useMoveApplication(jobId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveApp = active.data.current?.type === 'Application';
    const isOverApp = over.data.current?.type === 'Application';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveApp) return;

    // Moving app over another app
    if (isActiveApp && isOverApp) {
      setData((prev) => {
        const activeApp = active.data.current?.application;
        const overApp = over.data.current?.application;
        
        if (!activeApp || !overApp) return prev;
        
        const activeStageId = activeApp.stage_id;
        const overStageId = overApp.stage_id;

        if (activeStageId !== overStageId) {
          const activeItems = prev.applications[activeStageId] || [];
          const overItems = prev.applications[overStageId] || [];
          const activeIndex = activeItems.findIndex(t => t.id === activeId);
          const overIndex = overItems.findIndex(t => t.id === overId);
          
          return {
            ...prev,
            applications: {
              ...prev.applications,
              [activeStageId]: activeItems.filter(item => item.id !== activeId),
              [overStageId]: [
                ...overItems.slice(0, overIndex),
                { ...activeItems[activeIndex], stage_id: overStageId },
                ...overItems.slice(overIndex, overItems.length)
              ]
            }
          };
        }

        const items = prev.applications[activeStageId] || [];
        const activeIndex = items.findIndex(t => t.id === activeId);
        const overIndex = items.findIndex(t => t.id === overId);

        return {
          ...prev,
          applications: {
            ...prev.applications,
            [activeStageId]: arrayMove(items, activeIndex, overIndex)
          }
        };
      });
    }

    // Moving app over a column
    if (isActiveApp && isOverColumn) {
      setData((prev) => {
        const activeApp = active.data.current?.application;
        if (!activeApp) return prev;
        
        const activeStageId = activeApp.stage_id;
        const overStageId = overId as string;

        if (activeStageId === overStageId) return prev;

        const activeItems = prev.applications[activeStageId] || [];
        const overItems = prev.applications[overStageId] || [];
        const activeIndex = activeItems.findIndex(t => t.id === activeId);

        return {
          ...prev,
          applications: {
            ...prev.applications,
            [activeStageId]: activeItems.filter(item => item.id !== activeId),
            [overStageId]: [...overItems, { ...activeItems[activeIndex], stage_id: overStageId }]
          }
        };
      });
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeApp = active.data.current?.application;
    const overApp = over.data.current?.application;
    const overColumnId = over.data.current?.type === 'Column' ? over.id : null;

    if (!activeApp) return;
    
    // Original stage ID was stored before drag in the initialData
    let initialStageId = null;
    for (const sId in initialData.applications) {
      if (initialData.applications[sId].find(a => a.id === active.id)) {
        initialStageId = sId;
        break;
      }
    }

    const targetStageId = overColumnId || overApp?.stage_id;

    if (targetStageId && initialStageId !== targetStageId) {
      moveMutation.mutate({ applicationId: active.id as string, newStageId: targetStageId as string });
    }
  };

  const activeApplication = useMemo(() => {
    if (!activeId) return null;
    for (const stageId in data.applications) {
      const app = data.applications[stageId].find(a => a.id === activeId);
      if (app) return app;
    }
    return null;
  }, [activeId, data]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div className="flex gap-6 h-full overflow-x-auto pb-4 items-start">
        {data.stages.map(stage => (
          <KanbanColumn key={stage.id} stage={stage} applications={data.applications[stage.id] || []} />
        ))}
      </div>
      <DragOverlay>
        {activeApplication ? <CandidateCard application={activeApplication} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
