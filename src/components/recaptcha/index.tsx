import { Snackbar, Alert } from '@mui/material';
import axios from "axios";
import { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
function Recaptcha({setCaptcha}:{setCaptcha:(value: boolean) => void}) {
  const [open, setOpen] = useState(false);
  const reCaptch_sitekey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  const handleRecaptcha = async (value: string | null) => {
    const gRecaptchaToken = value;
    try {
      const response = await axios({
        method: "POST",
        url: "/api/recaptchaSubmit",
        data: {
          gRecaptchaToken,
        },
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
      });
      if (response?.data?.response?.success === true) {
        setCaptcha(true);
      } else {
        setCaptcha(false);
      }
      return value;
    } catch (err) {
    }
  };

  const handleClose = (event?: React.SyntheticEvent, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  return (
    <>
      <ReCAPTCHA
        className="my-5 w-[350px]"
        sitekey={reCaptch_sitekey ? reCaptch_sitekey : ""}
        onChange={handleRecaptcha}
        data-testid="recaptcha"
      />
      <Snackbar open={open} autoHideDuration={6000} onClose={() => handleClose()}>
        <Alert onClose={handleClose} severity="error" sx={{ width: '100%' }}>
          The CAPTCHA has expired. Please try again.
        </Alert>
      </Snackbar>
    </>
  );
}

export default Recaptcha;
