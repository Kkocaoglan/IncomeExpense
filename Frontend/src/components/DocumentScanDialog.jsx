import { useState, useRef, useContext } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Paper,
  IconButton,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { FinanceContext } from '../contexts/FinanceContext';
import { analyzeReceiptWithProxy } from '../Utils/azureTest';

const categories = {
  expense: [
    { value: 'mutfak', label: 'Mutfak' },
    { value: 'kira', label: 'Kira' },
    { value: 'beklenmeyen', label: 'Beklenmeyen' },
    { value: 'giyim', label: 'Giyim' },
    { value: 'faturalar', label: 'Faturalar' },
    { value: 'ulasim', label: 'Ulaşım' },
    { value: 'saglik', label: 'Sağlık' },
    { value: 'eglence', label: 'Eğlence' },
    { value: 'diger', label: 'Diğer' }
  ],
  income: [
    { value: 'maas', label: 'Maaş' },
    { value: 'ekgelir', label: 'Ek Gelir' },
    { value: 'yatirim', label: 'Yatırım Getirisi' },
    { value: 'diger', label: 'Diğer' }
  ]
};

const DocumentScanDialog = ({ open, handleClose, type }) => {
  const { addIncome, addExpense } = useContext(FinanceContext);
  const [activeTab, setActiveTab] = useState(0);
  const [image, setImage] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleCameraClick = () => {
    cameraInputRef.current.click();
  };

  const handleFileClick = () => {
    fileInputRef.current.click();
  };

  const handleCameraCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result);
        analyzeImage(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result);
        analyzeDocument(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearImage = () => {
    setImage(null);
    setFile(null);
    setExtractedData(null);
    setError(null);
    setSelectedCategory('');
  };

  const analyzeImage = async (imageFile) => {
    setLoading(true);
    setError(null);
    try {
      const { toplam, kdv } = await analyzeReceiptWithProxy(imageFile);
      const parsedAmount = Number(toplam) || 0;
      const parsedTax = Number(kdv) || 0;
      
      setExtractedData({
        description: 'Fişten otomatik',
        amount: parsedAmount,
        date: new Date().toISOString().split('T')[0],
        category: 'faturalar'
      });
      setSelectedCategory('faturalar');
    } catch (err) {
      setError('Görüntü analiz edilirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const analyzeDocument = async (documentFile) => {
    setLoading(true);
    setError(null);
    try {
      const { toplam, kdv } = await analyzeReceiptWithProxy(documentFile);
      if (type === 'expense') {
        const parsedAmount = Number(toplam) || 0;
        const parsedTax = Number(kdv) || 0;
        
        setExtractedData({
          description: 'Fişten otomatik',
          amount: parsedAmount,
          date: new Date().toISOString().split('T')[0],
          category: 'faturalar'
        });
        setSelectedCategory('faturalar');
      } else {
        const parsedAmount = Number(toplam) || 0;
        const parsedTax = Number(kdv) || 0;
        
        setExtractedData({
          description: 'Belge',
          amount: parsedAmount,
          date: new Date().toISOString().split('T')[0],
          category: 'diger'
        });
        setSelectedCategory('diger');
      }
    } catch (err) {
      setError('Belge analiz edilirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setSelectedCategory(category);
    if (extractedData) {
      setExtractedData(prev => ({
        ...prev,
        category
      }));
    }
  };

  const handleSubmit = () => {
    if (!extractedData || !selectedCategory) return;

    const transaction = {
      ...extractedData,
      category: selectedCategory,
      id: Date.now()
    };

    if (type === 'income') {
      addIncome(transaction);
    } else {
      addExpense(transaction);
    }

    handleClearImage();
    handleClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {type === 'income' 
              ? 'Gelir Belgesi Tarama' 
              : 'Gider Belgesi Tarama'
            }
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ textAlign: 'center' }}>
          {!image ? (
            <Paper 
              elevation={0} 
              sx={{ 
                p: 4, 
                border: '2px dashed', 
                borderColor: 'primary.main',
                cursor: 'pointer',
                mb: 2
              }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*,.pdf';
                input.onchange = (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    if (file.type.includes('pdf')) {
                      setFile(file);
                      analyzeDocument(file);
                    } else {
                      const reader = new FileReader();
                      reader.onload = () => {
                        setImage(reader.result);
                        analyzeImage(file);
                      };
                      reader.readAsDataURL(file);
                    }
                  }
                };
                input.click();
              }}
            >
              <FileUploadIcon fontSize="large" color="primary" />
              <Typography variant="h6" sx={{ mt: 1 }}>
                Belge veya Fotoğraf Yüklemek İçin Tıklayın
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Desteklenen formatlar: PDF, JPEG, PNG
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ position: 'relative' }}>
              {file && file.type.includes('pdf') ? (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6">
                    {file.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    PDF belgesi yüklendi
                  </Typography>
                </Paper>
              ) : (
                <img 
                  src={image} 
                  alt="Uploaded" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '400px', 
                    display: 'block',
                    margin: '0 auto'
                  }} 
                />
              )}
              <IconButton
                sx={{ 
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                  }
                }}
                onClick={handleClearImage}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          )}
        </Box>
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}
        
        {extractedData && (
          <Paper sx={{ p: 2, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Çıkarılan Bilgiler
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2">Açıklama</Typography>
                <Typography variant="body1">{extractedData.description}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Tutar</Typography>
                <Typography variant="body1">₺{extractedData.amount.toFixed(2)}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Tarih</Typography>
                <Typography variant="body1">{extractedData.date}</Typography>
              </Box>
              <Box sx={{ gridColumn: 'span 2' }}>
                <FormControl fullWidth>
                  <InputLabel>Kategori</InputLabel>
                  <Select
                    value={selectedCategory}
                    label="Kategori"
                    onChange={handleCategoryChange}
                  >
                    {categories[type].map((category) => (
                      <MenuItem key={category.value} value={category.value}>
                        {category.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Paper>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>İptal</Button>
        <Button 
          variant="contained" 
          color={type === 'income' ? 'success' : 'error'}
          onClick={handleSubmit}
          disabled={!extractedData || !selectedCategory || loading}
        >
          {type === 'income' ? 'Gelir Olarak Kaydet' : 'Gider Olarak Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentScanDialog; 