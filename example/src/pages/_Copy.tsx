import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

export const Copy = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const Icon = copied ? CheckIcon : CopyIcon;
  return (
    <Icon
      className="cursor-pointer"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      }}
    />
  );
};
