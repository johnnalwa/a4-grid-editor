"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: ZoomControlsProps) {
  return (
    <TooltipProvider>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-surface p-1.5 rounded-full shadow-lg border border-border z-10">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-foreground hover:bg-muted"
              onClick={onZoomOut}
              disabled={zoom <= 25}
            >
              <ZoomOut className="w-4 h-4" />
              <span className="sr-only">Zoom out</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Zoom Out</TooltipContent>
        </Tooltip>

        <div className="h-4 w-px bg-border" />

        <Button
          variant="ghost"
          size="sm"
          className="px-3 py-1 text-xs font-semibold rounded-full h-8 text-foreground hover:bg-muted"
          onClick={onResetZoom}
        >
          {zoom}%
        </Button>

        <div className="h-4 w-px bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-foreground hover:bg-muted"
              onClick={onZoomIn}
              disabled={zoom >= 200}
            >
              <ZoomIn className="w-4 h-4" />
              <span className="sr-only">Zoom in</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Zoom In</TooltipContent>
        </Tooltip>

        <div className="h-4 w-px bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-foreground hover:bg-muted"
              onClick={onResetZoom}
            >
              <Maximize className="w-4 h-4" />
              <span className="sr-only">Reset zoom</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Reset Zoom</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
