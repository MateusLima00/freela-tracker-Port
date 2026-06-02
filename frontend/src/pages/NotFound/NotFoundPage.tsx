import { Link } from 'react-router-dom'
import styles from './NotFoundPage.module.css'

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>Página não encontrada</h1>
      <p className={styles.desc}>
        A página que você está procurando não existe ou foi movida.
      </p>
      <Link to="/" className={styles.link}>Voltar ao início</Link>
    </div>
  )
}
