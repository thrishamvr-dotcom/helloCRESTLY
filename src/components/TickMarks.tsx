import { Check, CheckCheck } from 'lucide-react';
import type { MessageStatus } from '@/lib/types';

export function TickMarks({ status }: { status: MessageStatus }) {
  if (status === 'sent') {
    return <Check className="w-3.5 h-3.5 opacity-70" strokeWidth={2.5} />;
  }
  if (status === 'delivered') {
    return <CheckCheck className="w-3.5 h-3.5 opacity-70" strokeWidth={2.5} />;
  }
  // read = blue double tick
  return <CheckCheck className="w-3.5 h-3.5 text-sky-400" strokeWidth={2.5} />;
}
