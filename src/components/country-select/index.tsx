import { Select, MenuItem, FormControl, SelectChangeEvent } from "@mui/material";
import { hasFlag } from "country-flag-icons";
import * as flags from "country-flag-icons/react/3x2";
import React from "react";

import countries from "../../../countries.json";
import { CountryCodeOption, SelectWithFlagsProps, country } from "@/types/select-with-flags";

export function CountryDataGenerator(
  countries: CountryCodeOption[]
): CountryCodeOption[] {
  return countries
    .filter((item: country) => hasFlag(item.code))
    .map((item: country) => {
      const Icon = flags[item.code as keyof typeof flags];
      return {
        dial_code: item.dial_code,
        name: item.name,
        code: item.code,
        icon: <Icon className="w-[25px]" />,
      };
    });
}

const SelectWithFlags = (props: SelectWithFlagsProps) => {
  const {formikProps, value} = props;
  const handleChange = (event: SelectChangeEvent<string>) => {
    CountryDataGenerator(countries).find(
      (country) => country.code === event.target.value as string
    ) || {
      name: "United States",
      code: "US",
      dial_code: "+1",
      icon: <flags.US />,
    };
    formikProps.handleChange(event);
    formikProps.handleBlur(event);
  };

  return (
    <div>
      <FormControl fullWidth>
        <Select
          name="countryCode"
          autoComplete="on"
          id="country-select"
          value={value}
          onChange={handleChange}
          size="small"
          error={Boolean(
            formikProps.errors.email && formikProps.touched.email
          )}
          renderValue={(selected) => {
            const country = CountryDataGenerator(countries).find(
              (country) => country.code === selected
            ) || {
              name: "United States",
              code: "US",
              dial_code: "+1",
              icon: <flags.US />,
            };
            const Icon = flags[selected as keyof typeof flags];
            return (
              <div className="flex gap-2">
                <Icon className="w-[25px]" /> {country.dial_code}
              </div>
            );
          }}
        >
          {CountryDataGenerator(countries).map((country) => (
            <MenuItem key={country.code} value={country.code}>
              <div className="flex items-center gap-5">
                <span>{country.icon}</span> {country.name} (
                {country.dial_code})
              </div>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
};

export default SelectWithFlags;
