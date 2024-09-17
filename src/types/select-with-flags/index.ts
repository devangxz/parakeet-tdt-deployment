import { FormikProps } from "formik";

import { FormState } from "../signup";

export interface SelectWithFlagsProps {
  value: string;
  formikProps: FormikProps<FormState>
}

export interface CountryCodeOption {
  name: string;
  icon?: React.JSX.Element;
  dial_code: string;
  code: string;
}

export interface country {
  name: string;
  code: string;
  dial_code: string;
}

export type SetOpenFunction = (open: boolean) => void;
export type SetMessageFunction = (message: string) => void;
export type SetSeverityFunction = (severity: "success" | "error" | string ) => void;