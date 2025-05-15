import { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import { Box, Button, CircularProgress, useTheme, useMediaQuery } from '@mui/material';
import { CameraAlt, Cameraswitch, PhotoCamera } from '@mui/icons-material';

const CameraCapture = ({ onCapture, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const webcamRef = useRef(null);
  const [isCaptured, setIsCaptured] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");

  const capture = async () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setIsCaptured(true);
      setIsProcessing(true);
      
      try {
        // AI Vısıon yapılcak 
        
        onCapture(imageSrc);
      } catch (error) {
        console.error('Fotoğraf işlenirken hata oluştu:', error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const retake = () => {
    setIsCaptured(false);
  };

  const switchCamera = () => {
    setFacingMode(prevMode => 
      prevMode === "environment" ? "user" : "environment"
    );
  };

  const videoConstraints = {
    width: isMobile ? window.innerWidth : 720,
    height: isMobile ? window.innerWidth : 720,
    facingMode: facingMode
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      gap: 2,
      position: 'relative',
      width: '100%'
    }}>
      <Box sx={{
        width: '100%',
        maxWidth: isMobile ? '100%' : '720px',
        margin: '0 auto'
      }}>
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          style={{ 
            width: '100%',
            borderRadius: '8px'
          }}
        />
      </Box>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        gap: 2,
        justifyContent: 'center',
        width: '100%',
        mt: 2 
      }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Cameraswitch />}
          onClick={switchCamera}
          fullWidth={isMobile}
        >
          Kamera Değiştir
        </Button>

        {!isCaptured ? (
          <Button
            variant="contained"
            color="success"
            startIcon={<CameraAlt />}
            onClick={capture}
            disabled={isProcessing}
            fullWidth={isMobile}
          >
            {isProcessing ? 'İşleniyor...' : 'Fotoğraf Çek'}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="warning"
            startIcon={<PhotoCamera />}
            onClick={retake}
            fullWidth={isMobile}
          >
            Tekrar Çek
          </Button>
        )}

        <Button
          variant="contained"
          color="error"
          onClick={onClose}
          fullWidth={isMobile}
        >
          İptal
        </Button>
      </Box>

      {isProcessing && (
        <Box sx={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          bgcolor: 'rgba(0,0,0,0.7)',
          p: 3,
          borderRadius: 2,
          zIndex: 1000
        }}>
          <CircularProgress color="primary" />
          <Box sx={{ color: 'white' }}>Fotoğraf İşleniyor...</Box>
        </Box>
      )}
    </Box>
  );
};

export default CameraCapture; 