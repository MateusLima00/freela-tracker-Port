import { useState } from 'react'
import type { FormEvent } from 'react'
import { taskService } from '../../services/task.service'
import type { ITask } from '../../interfaces'
import { TaskStatus, Priority } from '../../enums'
import { Badge } from '../Badge/Badge'
import { TASK_STATUS_ICON } from '../../utils/constants'
import { formatDate } from '../../utils/format'
import { apiErrorMessage } from '../../utils/apiError'
import styles from '../../pages/admin/Projects/ProjectDetailPage.module.css'

const PRIORITY_OPTIONS = [
  { value: 'LOW',    label: 'Baixa' },
  { value: 'MEDIUM', label: 'Média' },
  { value: 'HIGH',   label: 'Alta' },
]

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  [TaskStatus.TODO]:        TaskStatus.IN_PROGRESS,
  [TaskStatus.IN_PROGRESS]: TaskStatus.DONE,
  [TaskStatus.DONE]:        TaskStatus.TODO,
}

const TASK_GROUPS = [
  { status: TaskStatus.TODO,        label: 'A fazer',      icon: TASK_STATUS_ICON.TODO },
  { status: TaskStatus.IN_PROGRESS, label: 'Em andamento', icon: TASK_STATUS_ICON.IN_PROGRESS },
  { status: TaskStatus.DONE,        label: 'Concluído',    icon: TASK_STATUS_ICON.DONE },
]

interface TasksSectionProps {
  projectId: string
  tasks: ITask[]
  onTasksChange: () => void   // callback para o pai recarregar o projeto
}

export function TasksSection({ projectId, tasks, onTasksChange }: TasksSectionProps) {
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskTitle,    setTaskTitle]    = useState('')
  const [taskPriority, setTaskPriority] = useState<Priority>(Priority.MEDIUM)
  const [taskDueDate,  setTaskDueDate]  = useState('')
  const [taskBusy,     setTaskBusy]     = useState(false)
  const [taskError,    setTaskError]    = useState('')

  async function handleCreateTask(e: FormEvent) {
    e.preventDefault()
    if (!taskTitle.trim()) return
    setTaskBusy(true)
    setTaskError('')
    try {
      await taskService.create({
        title:     taskTitle.trim(),
        priority:  taskPriority,
        dueDate:   taskDueDate ? new Date(taskDueDate + 'T12:00:00').toISOString() : null,
        projectId,
      })
      setTaskTitle('')
      setTaskPriority(Priority.MEDIUM)
      setTaskDueDate('')
      setShowTaskForm(false)
      onTasksChange()
    } catch (err) {
      setTaskError(apiErrorMessage(err, 'Erro ao criar tarefa.'))
    } finally {
      setTaskBusy(false)
    }
  }

  async function handleToggleTask(taskId: string, status: TaskStatus) {
    setTaskError('')
    try {
      await taskService.update(taskId, { status: NEXT_STATUS[status] })
      onTasksChange()
    } catch (err) {
      setTaskError(apiErrorMessage(err, 'Erro ao atualizar tarefa.'))
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('Deletar esta tarefa?')) return
    setTaskError('')
    try {
      await taskService.delete(taskId)
      onTasksChange()
    } catch (err) {
      setTaskError(apiErrorMessage(err, 'Erro ao deletar tarefa.'))
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Tarefas</h2>
        <button
          onClick={() => { setShowTaskForm((v) => !v); setTaskTitle(''); setTaskError('') }}
          className={styles.btnSecondary}
        >
          {showTaskForm ? 'Cancelar' : '+ Nova tarefa'}
        </button>
      </div>

      {showTaskForm && (
        <form onSubmit={handleCreateTask} className={styles.inlineForm}>
          <input
            type="text"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            className={`${styles.input} ${styles.inputGrow}`}
            placeholder="Título da tarefa"
            required
            autoFocus
          />
          <select
            value={taskPriority}
            onChange={(e) => setTaskPriority(e.target.value as Priority)}
            className={styles.select}
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={taskDueDate}
            onChange={(e) => setTaskDueDate(e.target.value)}
            className={styles.select}
            title="Prazo (opcional)"
          />
          <button type="submit" disabled={taskBusy} className={styles.btnPrimary}>
            {taskBusy ? '...' : 'Criar'}
          </button>
        </form>
      )}

      {taskError && <p className={styles.errorMsg}>{taskError}</p>}

      {tasks.length === 0 && (
        <p className={styles.empty}>Nenhuma tarefa cadastrada.</p>
      )}

      {TASK_GROUPS.map(({ status, label, icon }) => {
        const group = tasks.filter((t) => t.status === status)
        if (group.length === 0) return null
        return (
          <div key={status} className={styles.taskGroup}>
            <p className={styles.groupLabel}>
              {label} <span className={styles.groupCount}>{group.length}</span>
            </p>
            {group.map((task) => (
              <div
                key={task.id}
                className={`${styles.taskRow} ${status === TaskStatus.DONE ? styles.taskRowDone : ''}`}
              >
                <button
                  onClick={() => handleToggleTask(task.id, task.status)}
                  className={styles.taskToggle}
                  title={`Mover para ${NEXT_STATUS[task.status]}`}
                >
                  {icon}
                </button>
                <span className={styles.taskTitle}>{task.title}</span>
                {task.dueDate && (
                  <span className={styles.taskDue} title="Prazo da tarefa">{formatDate(task.dueDate)}</span>
                )}
                <Badge value={task.priority} />
                <button onClick={() => handleDeleteTask(task.id)} className={styles.btnDelete}>×</button>
              </div>
            ))}
          </div>
        )
      })}
    </section>
  )
}
