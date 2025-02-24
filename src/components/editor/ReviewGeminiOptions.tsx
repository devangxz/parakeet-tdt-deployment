"use client";

import { InfoIcon } from "lucide-react";
import React from "react";

import { Slider } from "../ui/slider";
import { Textarea } from "../ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

export interface GeminiPromptOption {
  id: number;
  title: string;
  label: string;
}

interface GeminiOptionsProps {
  promptOptions: GeminiPromptOption[];
  selectedPrompts: string[];
  setSelectedPrompts: React.Dispatch<React.SetStateAction<string[]>>;
  instructions: string;
  setInstructions: React.Dispatch<React.SetStateAction<string>>;
  temperature: number;
  setTemperature: React.Dispatch<React.SetStateAction<number>>;
  disabled?: boolean;
}

export function ReviewGeminiOptions({
  promptOptions,
  selectedPrompts,
  setSelectedPrompts,
  instructions,
  setInstructions,
  temperature,
  setTemperature,
  disabled,
}: GeminiOptionsProps) {

  function togglePrompt(option: string) {
    setSelectedPrompts((prev) =>
      prev.includes(option)
        ? prev.filter((prevOption) => prevOption !== option)
        : [...prev, option]
    );
  }

  return (
    <div className="pb-4 min-h-[20vh] space-y-8 transition-all duration-1000 ease-in-out">
      <div>
        <p className="text-sm font-medium">Prompt Options:</p>
        <div className="mt-2 flex flex-col gap-4">
          {promptOptions.map((option) => (
            <label key={option.id} className="inline-flex items-center space-x-2">
              <input
                type="checkbox"
                value={option.label}
                checked={selectedPrompts.includes(option.label)}
                onChange={() => togglePrompt(option.label)}
                className="h-4 w-4"
              />
              <span className="text-sm">{option.title}</span>
            </label>
          ))}
        </div>
      </div>
      <div className='flex space-x-2'>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Temperature </p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="w-5 h-5 text-gray-500 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Decrease the temperature to reduce the creativity of the AI</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          :
        </div>
        <Slider
          value={[temperature]}
          onValueChange={(value: number[]) => setTemperature(value[0])}
          step={0.1}
          min={0}
          max={2}
          disabled={disabled}
          className="w-1/3"
        />
        <span className="text-sm">{temperature}</span>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Additional Instructions</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="w-5 h-5 text-gray-500 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Provide additional prompts for Gemini to follow.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Textarea
          placeholder="Enter additional instructions. (Example: 'Make the transcript as accurate as possible')"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="mt-1 block w-full rounded border px-2 py-1 text-sm"
        />
      </div>
    </div>
  );
}