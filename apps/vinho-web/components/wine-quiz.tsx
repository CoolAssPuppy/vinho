"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { ChevronRight, ChevronLeft, Wine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Database } from "@/types/database";

interface WineQuizProps {
  userId: string;
  onComplete: () => void;
  onCancel: () => void;
}

const questions = [
  {
    id: "experience",
    question: "How would you describe your wine experience?",
    options: [
      { value: "beginner", label: "Just starting my wine journey" },
      { value: "casual", label: "I enjoy wine occasionally" },
      { value: "enthusiast", label: "I actively explore different wines" },
      { value: "connoisseur", label: "I have extensive wine knowledge" },
    ],
  },
  {
    id: "preference",
    question: "Which wine style do you generally prefer?",
    options: [
      { value: "red", label: "Bold reds with rich flavors" },
      { value: "white", label: "Crisp whites with bright acidity" },
      { value: "sparkling", label: "Bubbles and celebration" },
      { value: "mixed", label: "I love exploring all styles" },
    ],
  },
  {
    id: "body",
    question: "What body style appeals to you most?",
    options: [
      { value: "light", label: "Light and delicate" },
      { value: "medium", label: "Balanced and versatile" },
      { value: "full", label: "Rich and full-bodied" },
      { value: "varies", label: "Depends on the occasion" },
    ],
  },
  {
    id: "flavors",
    question: "Which flavor profile excites you?",
    options: [
      { value: "fruity", label: "Fresh fruits and berries" },
      { value: "earthy", label: "Earthy, mineral, and savory" },
      { value: "spicy", label: "Spices and herbs" },
      { value: "complex", label: "Complex and layered" },
    ],
  },
  {
    id: "occasion",
    question: "When do you typically enjoy wine?",
    options: [
      { value: "meals", label: "With meals and food pairings" },
      { value: "social", label: "At social gatherings" },
      { value: "relaxation", label: "For relaxation and unwinding" },
      { value: "tasting", label: "During dedicated tastings" },
    ],
  },
  {
    id: "adventure",
    question: "How adventurous are you with wine?",
    options: [
      { value: "comfort", label: "I stick to what I know I like" },
      { value: "curious", label: "I try new things occasionally" },
      { value: "explorer", label: "I love discovering new wines" },
      { value: "fearless", label: "The more unusual, the better" },
    ],
  },
  {
    id: "price",
    question: "What's your typical wine budget per bottle?",
    options: [
      { value: "value", label: "Under $20 - Great value wines" },
      { value: "everyday", label: "$20-40 - Everyday drinking" },
      { value: "premium", label: "$40-80 - Special occasions" },
      { value: "luxury", label: "$80+ - Investment wines" },
    ],
  },
];

export function WineQuiz({ userId, onComplete, onCancel }: WineQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const handleAnswer = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questions[currentQuestion].id]: value,
    }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          wine_preferences: answers,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Wine profile saved successfully!");
      onComplete();
    } catch (error) {
      toast.error("Failed to save preferences");
      console.error("Error saving quiz:", error);
    } finally {
      setSaving(false);
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const currentAnswer = answers[questions[currentQuestion].id];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Wine Preference Quiz</CardTitle>
            <CardDescription>
              Question {currentQuestion + 1} of {questions.length}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        <div className="w-full bg-secondary rounded-full h-2 mt-4">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">
            {questions[currentQuestion].question}
          </h3>
          <RadioGroup
            value={currentAnswer}
            onValueChange={handleAnswer}
            className="space-y-3"
          >
            {questions[currentQuestion].options.map((option) => (
              <div key={option.value} className="flex items-center space-x-3">
                <RadioGroupItem value={option.value} id={option.value} />
                <Label
                  htmlFor={option.value}
                  className="flex-1 cursor-pointer text-base"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {currentQuestion === questions.length - 1 ? (
            <Button
              onClick={handleComplete}
              disabled={!currentAnswer || saving}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? (
                <>
                  <Wine className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Complete Quiz"
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!currentAnswer}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
