import { ButtonProps } from "@mui/material";

export default function PrimaryButton(props: ButtonProps) {
    return <button {...props} color='primary' className='rounded-[32px] bg-[#6442ed] text-white p-3' />
}