import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientService } from '../../../services/client.service'
import { useAuth } from '../../../hooks/useAuth'
import type { IProject } from '../../../interfaces'
import { TaskStatus } from '../../../enums'
import { Badge } from '../../../components/Badge/Badge'
import { ProgressBar } from '../../../components/ProgressBar/ProgressBar'
import { formatDate, formatHours, daysUntil } from '../../../utils/format'
import styles from './ClientProjectsPage.module.css'

export function ClientProjectsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const showProgress = user?.kind === 'client' ? user.permissions.viewProgress : true

  const [projects, setProjects] = useState<IProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    clientService.getMyProjects()
      .then((res) => {
        const list = res.data.data
        // Projeto único: abre direto o dashboard dedicado
        if (list.length === 1) {
          navigate(`/client/projects/${list[0].id}`, { replace: true })
          return
        }
        setProjects(list)
      })
      .catch(() => setError('Erro ao carregar seus projetos.'))
      .finally(() => setIsLoading(false))
  }, [navigate])

  if (isLoading) return <p className="pageState">Carregando...</p>
  if (error) return <p className="pageState pageStateError">{error}</p>

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Meus Projetos</h1>

      {projects.length === 0 ? (
        <p className="pageState">Nenhum projeto encontrado.</p>
      ) : (
        <div className={styles.list}>
          {projects.map((project) => {
            const done = project.tasks.filter((t) => t.status === TaskStatus.DONE).length
            const deadlineDays = project.deadline ? daysUntil(project.deadline) : null
            return (
              <div
                key={project.id}
                className={styles.card}
                onClick={() => navigate(`/client/projects/${project.id}`)}
                role="button"
                tabIndex={0}
              >
                <div className={styles.cardTop}>
                  <div>
                    <h2 className={styles.projectTitle}>{project.title}</h2>
                    {project.description && <p className={styles.projectDesc}>{project.description}</p>}
                  </div>
                  <Badge value={project.status} />
                </div>

                {showProgress && (
                  <div className={styles.progressSection}>
                    <div className={styles.progressHeader}>
                      <span className={styles.progressLabel}>Progresso</span>
                      <span className={styles.progressPercent}>{project.progress}%</span>
                    </div>
                    <ProgressBar percent={project.progress} height={8} />
                  </div>
                )}

                <div className={styles.meta}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Tempo investido</span>
                    <span className={styles.metaValue}>{formatHours(project.totalTime)}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Tarefas</span>
                    <span className={styles.metaValue}>{done}/{project.tasks.length}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Prazo</span>
                    <span className={`${styles.metaValue} ${deadlineDays !== null && deadlineDays <= 7 ? styles.metaDanger : ''}`}>
                      {project.deadline
                        ? deadlineDays! < 0
                          ? `${Math.abs(deadlineDays!)}d atrás`
                          : `${deadlineDays} dias`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
