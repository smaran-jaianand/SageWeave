import { useState, useRef } from 'react'
import { ChevronRight, Folder, FolderOpen, FileCode, FileJson, FileText, File } from 'lucide-react'

export interface FileTreeNode {
  id: string
  name: string
  type: 'file' | 'folder'
  children?: FileTreeNode[]
  language?: string
}

// ─── Icon helpers ────────────────────────────────────────────────────────────
function getFileIcon(name: string) {
  if (name.endsWith('.ts') || name.endsWith('.tsx')) return FileCode
  if (name.endsWith('.json')) return FileJson
  if (name.endsWith('.md') || name.endsWith('.txt')) return FileText
  return File
}

// ─── FileTreeItem ─────────────────────────────────────────────────────────────
interface FileTreeItemProps {
  node: FileTreeNode
  depth?: number
  selectedId?: string
  onSelect?: (node: FileTreeNode) => void
  onContextMenu?: (node: FileTreeNode, e: React.MouseEvent) => void
  renamingId?: string | null
  renameValue?: string
  onRenameChange?: (v: string) => void
  onRenameCommit?: () => void
  onRenameCancel?: () => void
  creatingIn?: string | null
  creatingType?: 'file' | 'folder'
  newName?: string
  onNewNameChange?: (v: string) => void
  onNewNameCommit?: () => void
  onNewNameCancel?: () => void
}

function FileTreeItem({
  node, depth = 0, selectedId, onSelect, onContextMenu,
  renamingId, renameValue, onRenameChange, onRenameCommit, onRenameCancel,
  creatingIn, creatingType, newName, onNewNameChange, onNewNameCommit, onNewNameCancel,
}: FileTreeItemProps) {
  const [expanded, setExpanded] = useState(depth < 2)
  const renameRef = useRef<HTMLInputElement>(null)
  const newRef    = useRef<HTMLInputElement>(null)

  const isFolder   = node.type === 'folder'
  const isSelected = selectedId === node.id
  const isRenaming = renamingId === node.id

  const Icon = isFolder
    ? expanded ? FolderOpen : Folder
    : getFileIcon(node.name)

  const handleClick = () => {
    if (isFolder) setExpanded((e) => !e)
    else onSelect?.(node)
  }

  const handleDblClick = () => {
    if (onRenameChange && onRenameCommit) {
      onRenameChange(node.name)
      setTimeout(() => renameRef.current?.select(), 0)
    }
  }

  const sharedChildProps = {
    selectedId, onSelect, onContextMenu,
    renamingId, renameValue, onRenameChange, onRenameCommit, onRenameCancel,
    creatingIn, creatingType, newName, onNewNameChange, onNewNameCommit, onNewNameCancel,
  }

  return (
    <div>
      {/* Row */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onDoubleClick={handleDblClick}
        onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(node, e) }}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        className={`
          flex items-center gap-1.5 py-[3px] px-2 cursor-pointer select-none
          font-mono text-[12px] transition-colors group
          ${isSelected
            ? 'bg-ink text-paper-bright'
            : 'text-ink hover:bg-paper-dim'
          }
        `}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {isFolder && (
          <ChevronRight
            size={12} strokeWidth={2}
            className={`transition-transform flex-shrink-0 ${expanded ? 'rotate-90' : ''}`}
          />
        )}
        {!isFolder && <span className="w-3 flex-shrink-0" />}

        <Icon
          size={13} strokeWidth={1.6}
          className="flex-shrink-0"
          style={{ color: isSelected ? 'inherit' : isFolder ? '#0055FF' : '#444748' }}
        />

        {isRenaming ? (
          <input
            ref={renameRef}
            autoFocus
            value={renameValue}
            onChange={(e) => onRenameChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameCommit?.()
              if (e.key === 'Escape') onRenameCancel?.()
              e.stopPropagation()
            }}
            onBlur={onRenameCancel}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-paper-bright text-ink px-1 outline outline-2 outline-accent-blue font-mono text-[12px]"
          />
        ) : (
          <span className={`${isFolder ? 'font-semibold' : ''} flex-1 truncate`}>
            {node.name}
          </span>
        )}
      </div>

      {/* Children */}
      {isFolder && expanded && (
        <div>
          {node.children?.map((child) => (
            <FileTreeItem key={child.id} node={child} depth={depth + 1} {...sharedChildProps} />
          ))}

          {/* Inline new-item creation */}
          {creatingIn === node.id && (
            <div
              className="flex items-center gap-1.5 py-[3px] px-2"
              style={{ paddingLeft: `${8 + (depth + 1) * 16}px` }}
            >
              <span className="w-3 flex-shrink-0" />
              {creatingType === 'folder'
                ? <Folder size={13} className="text-accent-blue flex-shrink-0" />
                : <File size={13} className="text-ink-dim flex-shrink-0" />
              }
              <input
                ref={newRef}
                autoFocus
                value={newName}
                onChange={(e) => onNewNameChange?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onNewNameCommit?.()
                  if (e.key === 'Escape') onNewNameCancel?.()
                  e.stopPropagation()
                }}
                onBlur={onNewNameCancel}
                placeholder={creatingType === 'folder' ? 'folder name' : 'file name'}
                className="flex-1 bg-paper-bright text-ink px-1 outline outline-2 outline-accent-blue font-mono text-[12px] placeholder:text-ink-muted"
              />
            </div>
          )}
        </div>
      )}

      {/* Root-level new-item (creatingIn === '') */}
      {depth === 0 && creatingIn === '' && (
        <div className="flex items-center gap-1.5 py-[3px] px-2" style={{ paddingLeft: '8px' }}>
          <span className="w-3 flex-shrink-0" />
          {creatingType === 'folder'
            ? <Folder size={13} className="text-accent-blue flex-shrink-0" />
            : <File size={13} className="text-ink-dim flex-shrink-0" />
          }
          <input
            autoFocus
            value={newName}
            onChange={(e) => onNewNameChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onNewNameCommit?.()
              if (e.key === 'Escape') onNewNameCancel?.()
              e.stopPropagation()
            }}
            onBlur={onNewNameCancel}
            placeholder={creatingType === 'folder' ? 'folder name' : 'file name'}
            className="flex-1 bg-paper-bright text-ink px-1 outline outline-2 outline-accent-blue font-mono text-[12px] placeholder:text-ink-muted"
          />
        </div>
      )}
    </div>
  )
}

// ─── FileTree ─────────────────────────────────────────────────────────────────
export interface FileTreeProps {
  nodes: FileTreeNode[]
  selectedId?: string
  onSelect?: (node: FileTreeNode) => void
  onContextMenu?: (node: FileTreeNode, e: React.MouseEvent) => void
  renamingId?: string | null
  renameValue?: string
  onRenameChange?: (v: string) => void
  onRenameCommit?: () => void
  onRenameCancel?: () => void
  creatingIn?: string | null
  creatingType?: 'file' | 'folder'
  newName?: string
  onNewNameChange?: (v: string) => void
  onNewNameCommit?: () => void
  onNewNameCancel?: () => void
}

export function FileTree(props: FileTreeProps) {
  const { nodes, ...rest } = props
  return (
    <div className="overflow-y-auto h-full">
      {nodes.map((node) => (
        <FileTreeItem key={node.id} node={node} {...rest} />
      ))}
    </div>
  )
}
