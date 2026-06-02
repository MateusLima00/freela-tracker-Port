import styles from './ProgressBar.module.css'

interface ProgressBarProps {
  percent: number
  height?: number
  className?: string
}

export function ProgressBar({ percent, height = 6, className }: ProgressBarProps) {
  return (
    <div className={`${styles.track}${className ? ` ${className}` : ''}`} style={{ height }}>
      <div className={styles.fill} style={{ width: `${percent}%` }} />
    </div>
  )
}
