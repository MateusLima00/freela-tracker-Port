import styles from './Badge.module.css'
import { STATUS_LABEL } from '../../utils/constants'

interface BadgeProps {
  value: string
}

export function Badge({ value }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[value] ?? ''}`}>
      {STATUS_LABEL[value] ?? value}
    </span>
  )
}
