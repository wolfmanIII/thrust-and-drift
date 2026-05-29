import { useState } from 'react'
import { Modal } from '../modals/Modal.jsx'

export function LegalFooter() {
  const [showAbout, setShowAbout] = useState(false)

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 h-7 flex items-center px-3 bg-slate-950/95">
        <p className="text-xs text-slate-400 font-mono leading-none">
          The Traveller game in all forms is owned by Mongoose Publishing. Copyright 1977–2025 Mongoose Publishing. Non-commercial use only.
          {' '}
          <button
            onClick={() => setShowAbout(true)}
            className="underline hover:text-slate-200 transition-colors"
          >
            About
          </button>
        </p>
      </div>

      {showAbout && (
        <Modal title="ABOUT — THRUST & DRIFT" onClose={() => setShowAbout(false)} width="max-w-lg">
          <div className="space-y-4 font-mono text-xs text-slate-300 leading-relaxed">
            <p>
              <span className="text-[--neon-cyan] font-bold">Thrust &amp; Drift</span> is a free, non-commercial
              browser tool for playing Mongoose Traveller 2nd Edition space combat at the table.
            </p>
            <p>
              The Traveller, 2300AD, Twilight: 2000 and Dark Conspiracy games in all forms are owned by
              Mongoose Publishing. Copyright 1977–2025 Mongoose Publishing. Traveller is a registered
              trademark of Mongoose Publishing. Mongoose Publishing permits web sites and fanzines for
              this game, provided it contains this notice, that Mongoose Publishing is notified, and
              subject to a withdrawal of permission on 90 days notice.
            </p>
            <p>
              The contents of this site are for personal, non-commercial use only. Any use of Mongoose
              Publishing's copyrighted material or trademarks anywhere on this web site and its files
              should not be viewed as a challenge to those copyrights or trademarks. In addition, any
              program/articles/file on this site cannot be republished or distributed without the
              consent of the author who contributed it.
            </p>
            <p className="text-slate-500">
              Source code: personal use. Rules implemented: MgT2e CRB pp.160–168,
              Traveller Companion 2024 pp.169–186.
            </p>
          </div>
        </Modal>
      )}
    </>
  )
}
