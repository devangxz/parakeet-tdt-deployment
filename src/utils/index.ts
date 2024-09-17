import { SetMessageFunction, SetOpenFunction, SetSeverityFunction } from "@/types/select-with-flags";

export const showMessage = (
  {
    message,
    severity,
    open,
  }: { message: string; severity: string; open: boolean },
  stateSetters: {
    setMessage: SetMessageFunction;
    setSeverity: SetSeverityFunction;
    setOpen: SetOpenFunction;
  }
) => {
  const { setMessage, setSeverity, setOpen } = stateSetters;
  setMessage(message);
  setSeverity(severity);
  setOpen(open);
};
