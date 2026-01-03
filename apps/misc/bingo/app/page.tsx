"use client";

import { useState } from "react";
import { Button } from "@402systems/core-ui/components/ui/button";
import { Card } from "@402systems/core-ui/components/ui/card";
import { Input } from "@402systems/core-ui/components/ui/input";

export default function BingoPage() {
  const [grid, setGrid] = useState<string[]>(Array(25).fill(""));
  const [isPreview, setIsPreview] = useState(false);

  const updateCell = (index: number, value: string) => {
    const newGrid = [...grid];
    newGrid[index] = value;
    setGrid(newGrid);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center gap-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Bingo Builder</h1>
        <p className="text-slate-500">Create your custom 5x5 bingo board</p>
      </div>

      <div className="flex gap-4">
        <Button
          variant={isPreview ? "outline" : "default"}
          onClick={() => setIsPreview(false)}
        >
          Edit Board
        </Button>
        <Button
          variant={isPreview ? "default" : "outline"}
          onClick={() => setIsPreview(true)}
        >
          View Result
        </Button>
        <Button
          variant={"outline"}
          onClick={() => {
            const shuffledGrid = [...grid];
            shuffledGrid.sort(() => Math.random() - 0.5);
            const index = shuffledGrid.indexOf(grid[12]);
            [shuffledGrid[index], shuffledGrid[12]] = [shuffledGrid[12], shuffledGrid[index]];
            setGrid(shuffledGrid);
          }}
        >
          Shuffle
        </Button>
      </div>

      <Card className="p-6 bg-white shadow-xl border-slate-200">
        <div className="grid grid-cols-5 gap-3 w-fit">
          {grid.map((cell, i) => (
            <div key={i} className="w-24 h-24 sm:w-32 sm:h-32">
              {isPreview ? (
                <div className="w-full h-full flex items-center justify-center p-2 text-center border-2 border-slate-100 rounded-lg text-sm font-medium bg-slate-50 text-slate-700">
                  {cell || (i === 12 ? "FREE" : "-")}
                </div>
              ) : (
                <textarea
                  className="w-full h-full p-2 text-center text-sm border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none outline-none transition-all"
                  value={cell}
                  onChange={(e) => updateCell(i, e.target.value)}
                  placeholder={i === 12 ? "FREE SPACE" : `Cell ${i + 1}`}
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      {isPreview && (
        <Button onClick={() => window.print()} variant="secondary">
          Print Board
        </Button>
      )}
    </div>
  );
}
