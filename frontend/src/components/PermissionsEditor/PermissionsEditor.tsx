import type { IClientPermissions } from '../../interfaces'
import { PERMISSION_GROUPS } from '../../utils/constants'
import styles from './PermissionsEditor.module.css'

interface PermissionsEditorProps {
  value: IClientPermissions
  onChange: (next: IClientPermissions) => void
  disabled?: boolean
}

// Editor de permissões reutilizável (criação e edição de cliente).
// Renderiza toggles agrupados a partir de PERMISSION_GROUPS.
export function PermissionsEditor({ value, onChange, disabled }: PermissionsEditorProps) {
  function toggle(key: keyof IClientPermissions) {
    onChange({ ...value, [key]: !value[key] })
  }

  return (
    <div className={styles.editor}>
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.group} className={styles.group}>
          <p className={styles.groupTitle}>{group.group}</p>
          {group.items.map((item) => (
            <label
              key={item.key}
              className={`${styles.row} ${disabled ? styles.rowDisabled : ''}`}
            >
              <div className={styles.rowText}>
                <span className={styles.rowLabel}>{item.label}</span>
                <span className={styles.rowDesc}>{item.description}</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={value[item.key]}
                aria-label={item.label}
                className={`${styles.switch} ${value[item.key] ? styles.switchOn : ''}`}
                onClick={() => !disabled && toggle(item.key)}
                disabled={disabled}
              >
                <span className={styles.knob} />
              </button>
            </label>
          ))}
        </div>
      ))}
    </div>
  )
}
