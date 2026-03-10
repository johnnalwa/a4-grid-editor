"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotesTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectBlank: () => void;
  onSelectTemplate: () => void;
}

const BLANK_PREVIEW_LINES = 8;
const TEMPLATE_CHECKLIST_ROWS = 3;

export function NotesTypeDialog({
  open,
  onOpenChange,
  onSelectBlank,
  onSelectTemplate,
}: NotesTypeDialogProps) {
  const handleSelect = (callback: () => void) => {
    callback();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-surface">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <NotebookPen className="w-5 h-5 text-amber-500" />
            Add Notes Page
          </DialogTitle>
          <DialogDescription>
            Choose a blank page or start with the structured notes template.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 pt-1">
          <button
            type="button"
            onClick={() => handleSelect(onSelectBlank)}
            className={cn(
              "group flex flex-col items-center gap-3 rounded-xl border-2 border-border p-4",
              "hover:border-amber-400 hover:shadow-md transition-all cursor-pointer"
            )}
          >
            <div
              className="relative w-full overflow-hidden rounded-sm border border-border"
              style={{ aspectRatio: "210/297", backgroundColor: "#ffffff" }}
            >
              {Array.from({ length: BLANK_PREVIEW_LINES }).map((_, index) => (
                <div
                  key={index}
                  className="absolute left-0 right-0"
                  style={{
                    top: `${8.5 + index * 11.5}%`,
                    height: "1px",
                    backgroundColor: "#9ec5e8",
                    opacity: 0.6,
                  }}
                />
              ))}
              <div
                className="absolute top-0 bottom-0"
                style={{
                  left: "9%",
                  width: "1px",
                  backgroundColor: "rgba(210,50,50,0.5)",
                }}
              />
            </div>

            <div className="text-center">
              <p className="text-xs font-semibold text-foreground">Blank</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Empty lined page
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelect(onSelectTemplate)}
            className={cn(
              "group flex flex-col items-center gap-3 rounded-xl border-2 border-border p-4",
              "hover:border-amber-400 hover:shadow-md transition-all cursor-pointer"
            )}
          >
            <div
              className="relative w-full overflow-hidden rounded-sm border border-border"
              style={{ aspectRatio: "210/297", backgroundColor: "#ffffff" }}
            >
              {Array.from({ length: BLANK_PREVIEW_LINES }).map((_, index) => (
                <div
                  key={index}
                  className="absolute left-0 right-0"
                  style={{
                    top: `${8.5 + index * 11.5}%`,
                    height: "1px",
                    backgroundColor: "#9ec5e8",
                    opacity: 0.6,
                  }}
                />
              ))}
              <div
                className="absolute top-0 bottom-0"
                style={{
                  left: "9%",
                  width: "1px",
                  backgroundColor: "rgba(210,50,50,0.5)",
                }}
              />

              <div className="absolute inset-0 px-[12%] pt-[7%]">
                <div className="flex h-[10%] items-center gap-[6%] text-slate-700">
                  <span className="w-[22%] text-[4px] font-black uppercase tracking-[0.18em]">
                    Date
                  </span>
                  <div className="h-[1px] flex-1 bg-slate-400/60" />
                </div>

                <div className="mt-[2%] flex h-[10%] items-center gap-[6%] text-slate-700">
                  <span className="w-[22%] text-[4px] font-black uppercase tracking-[0.18em]">
                    Subject
                  </span>
                  <div className="h-[1px] flex-1 bg-slate-400/60" />
                </div>

                <div className="mt-[8%] inline-flex rounded-[2px] bg-blue-600 px-[4%] py-[2%] text-[3.8px] font-black uppercase tracking-[0.2em] text-white">
                  Notes
                </div>

                <div className="mt-[6%] space-y-[7%]">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-[1px] bg-slate-500/45"
                    />
                  ))}
                </div>

                <div className="mt-[12%] flex items-center justify-between gap-[4%]">
                  <div className="inline-flex rounded-[2px] bg-blue-600 px-[4%] py-[2%] text-[3.8px] font-black uppercase tracking-[0.2em] text-white">
                    Checklist
                  </div>
                  <div className="rounded-full bg-slate-900/8 px-[5%] py-[2%] text-[3.5px] font-bold text-slate-600">
                    Add
                  </div>
                </div>

                <div className="mt-[7%] space-y-[6%]">
                  {Array.from({ length: TEMPLATE_CHECKLIST_ROWS }).map((_, index) => (
                    <div key={index} className="flex items-center gap-[6%]">
                      <div className="h-[5px] w-[5px] rounded-[1px] border border-slate-600" />
                      <div className="h-[1px] flex-1 bg-slate-500/45" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5">
                <p className="text-xs font-semibold text-foreground">Template</p>
                <span className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                  NEW
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Date, Subject, Notes, Checklist
              </p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
