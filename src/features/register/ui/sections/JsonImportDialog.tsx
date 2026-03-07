/**
 * カタログ JSON の部分上書き入力ダイアログ
 */
import { Alert } from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import { FileBraces } from 'lucide-react';
import { layout, state, surface, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

interface RegisterJsonImportDialogProps {
  open: boolean;
  value: string;
  error: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onApply: () => void;
}

export default function RegisterJsonImportDialog({
  open,
  value,
  error,
  onChange,
  onClose,
  onApply,
}: RegisterJsonImportDialogProps) {
  const templateJsonUrl = 'https://github.com/Neosku/aviutl2-catalog-data/blob/main/template.json';
  if (!open) return null;

  return (
    <div className={layout.fixedCenterBlur} role="dialog" aria-modal="true">
      <Button
        variant="plain"
        size="none"
        type="button"
        aria-label="閉じる"
        className={surface.overlayFade}
        onClick={onClose}
      />
      <div className={cn(surface.modal, 'relative w-full max-w-3xl')}>
        <div className={surface.modalHeaderMuted}>
          <h3 className={cn(layout.inlineGap2, text.titleLg)}>
            <FileBraces size={18} />
            JSON 入力
          </h3>
        </div>
        <div className="space-y-3 px-6 py-5">
          <p className={text.bodySmMutedAlt}>
            <a
              href={templateJsonUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="font-mono text-blue-600 underline decoration-blue-300 underline-offset-2 transition hover:text-blue-700 dark:text-blue-400 dark:decoration-blue-500 dark:hover:text-blue-300"
            >
              template.json
            </a>{' '}
            と同じ形式の JSON を貼り付けてください。 一致する項目は部分上書きし、未一致の
            idは新規追加します。複数パッケージをまとめて追加することもできます。
          </p>
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={`[\n  {\n    "id": "author.pluginName",\n    "name": "Example Plugin",\n    "type": "入力プラグイン",\n    "summary": "プラグインの概要がここに入ります。"\n  },\n  {\n    "id": "author.scriptName",\n    "name": "Example Script",\n    "type": "スクリプト",\n    "summary": "スクリプトの概要がここに入ります。"\n  }\n]`}
            className={cn(
              state.focusRing,
              'h-80 w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs leading-5 text-slate-800 shadow-inner dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100',
            )}
          />
          {error && (
            <Alert variant="danger" className="px-3 py-2">
              {error}
            </Alert>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
          <Button variant="secondary" size="actionSm" type="button" className="border-slate-300" onClick={onClose}>
            キャンセル
          </Button>
          <Button variant="primary" size="actionSm" type="button" className="shadow-sm" onClick={onApply}>
            適用
          </Button>
        </div>
      </div>
    </div>
  );
}
