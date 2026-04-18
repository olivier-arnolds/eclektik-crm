import { useState, useCallback } from 'react';
import { updateRow, insertRow } from './useSupabase';

const emptyForm = { title: '', due_date: '', description: '' };

export function useItemTasks(item, refetch) {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState(emptyForm);
  const [savingTask, setSavingTask] = useState(false);

  const toggleTask = useCallback(
    async (t) => {
      await updateRow('tasks', t.id, { status: t.done ? 'pending' : 'done' });
      refetch();
    },
    [refetch]
  );

  const createTask = useCallback(async () => {
    if (!taskForm.title.trim()) return;
    setSavingTask(true);
    const row = {
      title: taskForm.title.trim(),
      status: 'pending',
      due_date: taskForm.due_date || null,
      description: taskForm.description.trim() || null,
      contact_id: item?.contactIds?.[0] || null,
      opportunity_id: item.funnelStage !== 'lead' ? item.id : null,
      lead_id: item.funnelStage === 'lead' ? item.id : null,
      owner: item.owner || null,
    };
    await insertRow('tasks', row);
    setTaskForm(emptyForm);
    setShowTaskForm(false);
    setSavingTask(false);
    refetch();
  }, [taskForm, item, refetch]);

  return {
    showTaskForm,
    setShowTaskForm,
    taskForm,
    setTaskForm,
    savingTask,
    toggleTask,
    createTask,
  };
}
