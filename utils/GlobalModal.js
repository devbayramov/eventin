import React, { createContext, useContext, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, ScrollView, BackHandler, PanResponder } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/theme';
import { useLanguage, translations } from '../context/language';

const { width, height } = Dimensions.get('window');

// Modal Context
const ModalContext = createContext({
  visible: false,
  showModal: () => {},
  hideModal: () => {},
  applyFilters: () => {},
  resetAllFilters: () => {},
  selectedRegion: "Bütün bölgələr",
  setSelectedRegion: () => {},
  selectedSort: "",
  setSelectedSort: () => {},
  selectedEventType: "Bütün növlər",
  setSelectedEventType: () => {},
  selectedPayment: "Hamısı",
  setSelectedPayment: () => {},
  selectedDocument: "Hamısı",
  setSelectedDocument: () => {},
  selectedCategory: "Hamısı",
  setSelectedCategory: () => {},
  hasActiveFilters: false
});

// Modal Provider
export const GlobalModalProvider = ({ children }) => {
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  
  const [modalVisible, setModalVisible] = useState(false);
  const [showRegions, setShowRegions] = useState(false);
  const [showEventTypes, setShowEventTypes] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  const [selectedRegion, setSelectedRegion] = useState("Bütün bölgələr");
  const [selectedSort, setSelectedSort] = useState(""); // nearToFar, farToNear, createdAt
  const [selectedEventType, setSelectedEventType] = useState("Bütün növlər");
  const [selectedPayment, setSelectedPayment] = useState("Hamısı");
  const [selectedDocument, setSelectedDocument] = useState("Hamısı");
  const [selectedCategory, setSelectedCategory] = useState("Hamısı");

  const [tempRegion, setTempRegion] = useState("Bütün bölgələr");
  const [tempSort, setTempSort] = useState("");
  const [tempEventType, setTempEventType] = useState("Bütün növlər");
  const [tempPayment, setTempPayment] = useState("Hamısı");
  const [tempDocument, setTempDocument] = useState("Hamısı");
  const [tempCategory, setTempCategory] = useState("Hamısı");

  // Statik kateqoriyalar - Əyləncə və Karyera əsas kateqoriyaları
  const categories = {
    "Əyləncə": [
      "Konsert",
      "Teatr",
      "Festival",
      "Film",
      "Oyun gecəsi",
      "Stand-up",
      "Musiqi",
      "Rəqs"
    ],
    "Karyera": [
      "Seminar",
      "Konfrans",
      "Workshop",
      "Networking",
      "Təlim",
      "Mentorluq",
      "İş yarmarkası",
      "Startap"
    ]
  };
  
  const contentAnim = React.useRef(new Animated.Value(0)).current;
  const filterAnim = React.useRef(new Animated.Value(width)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const backAction = () => {
      if (modalVisible) {
        hideModal();
        return true; 
      }
      return false; 
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove(); 
  }, [modalVisible]);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => modalVisible,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return modalVisible && gestureState.dx > 10 && Math.abs(gestureState.dy) < 50;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx > 0) {
          filterAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > width / 3) {
          Animated.parallel([
            Animated.timing(contentAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(filterAnim, {
              toValue: width,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            })
          ]).start();
          
          setTimeout(() => {
            setModalVisible(false);
          }, 300);
        } else {
          Animated.parallel([
            Animated.spring(filterAnim, {
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.spring(opacityAnim, {
              toValue: 1,
              useNativeDriver: true,
            })
          ]).start();
        }
      }
    })
  ).current;

  const hasActiveFilters = selectedRegion !== "Bütün bölgələr" ||
                          selectedSort !== "" ||
                          selectedEventType !== "Bütün növlər" ||
                          selectedPayment !== "Hamısı" ||
                          selectedDocument !== "Hamısı" ||
                          selectedCategory !== "Hamısı";
  
  const showModal = () => {
    setTempRegion(selectedRegion);
    setTempSort(selectedSort);
    setTempEventType(selectedEventType);
    setTempPayment(selectedPayment);
    setTempDocument(selectedDocument);
    setTempCategory(selectedCategory);

    setShowRegions(false);
    setShowEventTypes(false);
    setShowPayments(false);
    setShowDocuments(false);
    setShowCategories(false);
    
    filterAnim.setValue(width);
    opacityAnim.setValue(0);
    
    setModalVisible(true);
    
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentAnim, {
          toValue: -width,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(filterAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }, 50);
  };
  
  const hideModal = () => {
    Animated.parallel([
      Animated.timing(contentAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(filterAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
    
    setTimeout(() => {
      setModalVisible(false);
    }, 300); 
  };

  const applyFilters = () => {
    setSelectedRegion(tempRegion);
    setSelectedSort(tempSort);
    setSelectedEventType(tempEventType);
    setSelectedPayment(tempPayment);
    setSelectedDocument(tempDocument);
    setSelectedCategory(tempCategory);

    hideModal();
  };
  
  const resetFilters = () => {
    setTempRegion("Bütün bölgələr");
    setTempSort("");
    setTempEventType("Bütün növlər");
    setTempPayment("Hamısı");
    setTempDocument("Hamısı");
    setTempCategory("Hamısı");
  };

  const resetAllFilters = () => {
    setSelectedRegion("Bütün bölgələr");
    setSelectedSort("");
    setSelectedEventType("Bütün növlər");
    setSelectedPayment("Hamısı");
    setSelectedDocument("Hamısı");
    setSelectedCategory("Hamısı");

    setTempRegion("Bütün bölgələr");
    setTempSort("");
    setTempEventType("Bütün növlər");
    setTempPayment("Hamısı");
    setTempDocument("Hamısı");
    setTempCategory("Hamısı");
  };

  const regions = [
    "Bütün bölgələr",
    "Bakı",
    "Beynəlxalq",
    "Gəncə",
    "Sumqayıt",
    "Ağcabədi",
    "Ağdam",
    "Ağdaş",
    "Ağdərə",
    "Ağstafa",
    "Ağsu",
    "Astara",
    "Babək",
    "Balakən",
    "Beyləqan",
    "Bərdə",
    "Biləsuvar",
    "Cəbrayıl",
    "Cəlilabad",
    "Culfa",
    "Daşkəsən",
    "Füzuli",
    "Gədəbəy",
    "Goranboy",
    "Göyçay",
    "Göygöl",
    "Hacıqabul",
    "Xaçmaz",
    "Xızı",
    "Xocalı",
    "Xocavənd",
    "İmişli",
    "İsmayıllı",
    "Kəlbəcər",
    "Kəngərli",
    "Kürdəmir",
    "Qax",
    "Qazax",
    "Qəbələ",
    "Qobustan",
    "Quba",
    "Qubadlı",
    "Qusar",
    "Laçın",
    "Lerik",
    "Lənkəran",
    "Masallı",
    "Neftçala",
    "Oğuz",
    "Ordubad",
    "Saatlı",
    "Sabirabad",
    "Salyan",
    "Samux",
    "Sədərək",
    "Siyəzən",
    "Şabran",
    "Şahbuz",
    "Şamaxı",
    "Şəmkir",
    "Şərur",
    "Şəki",
    "Şuşa",
    "Tərtər",
    "Tovuz",
    "Ucar",
    "Yardımlı",
    "Zaqatala",
    "Zəngilan",
    "Zərdab",
  ];
  
  const eventTypes = [
    "Bütün növlər",
    "Seminar",
    "Konfrans",
    "Webinar",
    "Workshop",
    "Təlim",
    "Sərgi",
    "İclas",
    "Könüllülük proqramı",
    "Təcrübə proqramı",
  ];

  const paymentTypes = [
    "Hamısı",
    "Ödənişsiz",
    "Ödənişli",
    "Dövlət dəstəyi ilə"
  ];

  const documentTypes = [
    "Hamısı",
    "Sertifikat",
    "İştirak sənədi",
    "Sənədsiz"
  ];

  const hasActiveTemp = tempRegion !== "Bütün bölgələr" ||
                       tempSort !== "" ||
                       tempEventType !== "Bütün növlər" ||
                       tempPayment !== "Hamısı" ||
                       tempDocument !== "Hamısı" ||
                       tempCategory !== "Hamısı";

  const toggleDropdown = (dropdown) => {
    if (dropdown === 'regions') {
      setShowRegions(!showRegions);
      setShowEventTypes(false);
      setShowPayments(false);
      setShowDocuments(false);
      setShowCategories(false);
    } else if (dropdown === 'eventTypes') {
      setShowRegions(false);
      setShowEventTypes(!showEventTypes);
      setShowPayments(false);
      setShowDocuments(false);
      setShowCategories(false);
    } else if (dropdown === 'payments') {
      setShowRegions(false);
      setShowEventTypes(false);
      setShowPayments(!showPayments);
      setShowDocuments(false);
      setShowCategories(false);
    } else if (dropdown === 'documents') {
      setShowRegions(false);
      setShowEventTypes(false);
      setShowPayments(false);
      setShowDocuments(!showDocuments);
      setShowCategories(false);
    } else if (dropdown === 'categories') {
      setShowRegions(false);
      setShowEventTypes(false);
      setShowPayments(false);
      setShowDocuments(false);
      setShowCategories(!showCategories);
    }
  };

  // Dynamic styles
  const dynamicStyles = {
    content: {
      flex: 1,
      width: '100%',
      backgroundColor: isDarkMode ? '#111827' : '#fff',
    },
    filterContainer: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: isDarkMode ? '#111827' : '#fff',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#374151' : '#eee',
      zIndex: 10,
    },
    backButton: {
      padding: 8,
      width: 44,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      textAlign: 'center',
      color: isDarkMode ? '#E5E7EB' : '#000',
    },
    resetButtonText: {
      color: isDarkMode ? '#818CF8' : '#4F46E5',
      fontSize: 16,
    },
    filterSection: {
      marginBottom: 24,
      position: 'relative',
      zIndex: 1,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 12,
      color: isDarkMode ? '#E5E7EB' : '#000',
    },
    filterButton: {
      flex: 1,
      backgroundColor: isDarkMode ? '#1F2937' : '#F5F5F5',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 8,
      alignItems: 'center',
      marginRight: 8,
      minWidth: 100,
    },
    selectedFilterButton: {
      backgroundColor: '#4F46E5',
    },
    filterButtonText: {
      fontSize: 14,
      color: isDarkMode ? '#E5E7EB' : '#333',
    },
    selectedFilterButtonText: {
      color: '#FFF',
    },
    dropdownButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#1F2937' : '#F5F5F5',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    dropdownButtonText: {
      fontSize: 16,
      color: isDarkMode ? '#E5E7EB' : '#333',
    },
    dropdownList: {
      backgroundColor: isDarkMode ? '#1F2937' : '#FFF',
      borderRadius: 8,
      marginTop: 8,
      borderWidth: 1,
      borderColor: isDarkMode ? '#374151' : '#EEE',
      maxHeight: 200,
      position: 'relative',
      zIndex: 5,
    },
    dropdownItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#374151' : '#F5F5F5',
    },
    selectedDropdownItem: {
      backgroundColor: isDarkMode ? '#374151' : '#F0F5FF',
    },
    dropdownItemText: {
      fontSize: 16,
      color: isDarkMode ? '#E5E7EB' : '#333',
    },
    selectedDropdownItemText: {
      color: isDarkMode ? '#818CF8' : '#4F46E5',
      fontWeight: 'bold',
    },
    footer: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#374151' : '#eee',
      backgroundColor: isDarkMode ? '#111827' : '#fff',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    },
  };

  return (
    <ModalContext.Provider
      value={{
        visible: modalVisible,
        showModal,
        hideModal,
        selectedRegion,
        setSelectedRegion,
        selectedSort,
        setSelectedSort,
        selectedEventType,
        setSelectedEventType,
        selectedPayment,
        setSelectedPayment,
        selectedDocument,
        setSelectedDocument,
        selectedCategory,
        setSelectedCategory,
        applyFilters,
        hasActiveFilters,
        resetAllFilters
      }}
    >
      <View style={styles.container}>
        {/* Ana içerik */}
        <Animated.View 
          style={[
            dynamicStyles.content, 
            { transform: [{ translateX: contentAnim }] }
          ]}
        >
          {children}
        </Animated.View>
        {modalVisible && (
          <Animated.View 
            style={[
              styles.filterPage, 
              { 
                transform: [{ translateX: filterAnim }],
                opacity: opacityAnim,
                zIndex: 10
              }
            ]}
            {...panResponder.panHandlers}
          >
            <SafeAreaView style={dynamicStyles.filterContainer}>
              {/* Başlık */}
              <View style={dynamicStyles.header}>
                <TouchableOpacity 
                  style={dynamicStyles.backButton}
                  onPress={hideModal}
                >
                  <Ionicons name="chevron-back" size={28} color={isDarkMode ? "#E5E7EB" : "#000"} />
                </TouchableOpacity>
                <View style={styles.titleContainer}>
                  <Text style={dynamicStyles.headerTitle}>{t.filters.title}</Text>
                </View>
                
                {hasActiveTemp && (
                  <TouchableOpacity 
                    style={styles.resetButton}
                    onPress={resetFilters}
                  >
                    <Text style={dynamicStyles.resetButtonText}>{t.filters.reset}</Text>
                  </TouchableOpacity>
                )}
                {!hasActiveTemp && <View style={styles.spacer} />}
              </View>
              
              <ScrollView 
                style={styles.filterContent}
                contentContainerStyle={styles.filterContentContainer}
                showsVerticalScrollIndicator={true}
              >
                <View style={dynamicStyles.filterSection}>
                  <Text style={dynamicStyles.sectionTitle}>{t.filters.dateFilter}</Text>
                  <View style={styles.buttonGroup}>
                    <TouchableOpacity 
                      style={[
                        dynamicStyles.filterButton,
                        tempSort === 'nearToFar' && dynamicStyles.selectedFilterButton
                      ]}
                      onPress={() => setTempSort('nearToFar')}
                    >
                      <Text style={[
                        dynamicStyles.filterButtonText,
                        tempSort === 'nearToFar' && dynamicStyles.selectedFilterButtonText
                      ]}>{t.filters.nearFirst}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[
                        dynamicStyles.filterButton,
                        tempSort === 'farToNear' && dynamicStyles.selectedFilterButton
                      ]}
                      onPress={() => setTempSort('farToNear')}
                    >
                      <Text style={[
                        dynamicStyles.filterButtonText,
                        tempSort === 'farToNear' && dynamicStyles.selectedFilterButtonText
                      ]}>{t.filters.farFirst}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[
                        dynamicStyles.filterButton,
                        tempSort === 'createdAt' && dynamicStyles.selectedFilterButton
                      ]}
                      onPress={() => setTempSort('createdAt')}
                    >
                      <Text style={[
                        dynamicStyles.filterButtonText,
                        tempSort === 'createdAt' && dynamicStyles.selectedFilterButtonText
                      ]}>{t.filters.byDate}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Bölge seçimi - Buton + Dropdown */}
                <View style={dynamicStyles.filterSection}>
                  <Text style={dynamicStyles.sectionTitle}>{t.filters.region}</Text>
                  <TouchableOpacity 
                    style={dynamicStyles.dropdownButton}
                    onPress={() => toggleDropdown('regions')}
                  >
                    <Text style={dynamicStyles.dropdownButtonText}>{tempRegion}</Text>
                    <Ionicons 
                      name={showRegions ? "chevron-up" : "chevron-down"} 
                      size={24} 
                      color={isDarkMode ? "#E5E7EB" : "#444"} 
                    />
                  </TouchableOpacity>
                  
                  {/* Bölge Dropdown listesi */}
                  {showRegions && (
                    <View style={dynamicStyles.dropdownList}>
                      <ScrollView 
                        style={{ maxHeight: 200 }}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {regions.map((region, index) => (
                          <TouchableOpacity 
                            key={index}
                            style={[
                              dynamicStyles.dropdownItem,
                              tempRegion === region && dynamicStyles.selectedDropdownItem
                            ]}
                            onPress={() => {
                              setTempRegion(region);
                              setShowRegions(false);
                            }}
                          >
                            <Text style={[
                              dynamicStyles.dropdownItemText,
                              tempRegion === region && dynamicStyles.selectedDropdownItemText
                            ]}>{region}</Text>
                            
                            {tempRegion === region && (
                              <Ionicons name="checkmark" size={20} color={isDarkMode ? "#818CF8" : "#4F46E5"} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
                
                {/* Etkinlik Türü seçimi */}
                <View style={dynamicStyles.filterSection}>
                  <Text style={dynamicStyles.sectionTitle}>{t.filters.eventType}</Text>
                  <TouchableOpacity 
                    style={dynamicStyles.dropdownButton}
                    onPress={() => toggleDropdown('eventTypes')}
                  >
                    <Text style={dynamicStyles.dropdownButtonText}>{tempEventType}</Text>
                    <Ionicons 
                      name={showEventTypes ? "chevron-up" : "chevron-down"} 
                      size={24} 
                      color={isDarkMode ? "#E5E7EB" : "#444"} 
                    />
                  </TouchableOpacity>
                  
                  {/* Etkinlik Türü Dropdown listesi */}
                  {showEventTypes && (
                    <View style={dynamicStyles.dropdownList}>
                      <ScrollView 
                        style={{ maxHeight: 200 }}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {eventTypes.map((type, index) => (
                          <TouchableOpacity 
                            key={index}
                            style={[
                              dynamicStyles.dropdownItem,
                              tempEventType === type && dynamicStyles.selectedDropdownItem
                            ]}
                            onPress={() => {
                              setTempEventType(type);
                              setShowEventTypes(false);
                            }}
                          >
                            <Text style={[
                              dynamicStyles.dropdownItemText,
                              tempEventType === type && dynamicStyles.selectedDropdownItemText
                            ]}>{type}</Text>
                            
                            {tempEventType === type && (
                              <Ionicons name="checkmark" size={20} color={isDarkMode ? "#818CF8" : "#4F46E5"} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Ödeme türü seçimi */}
                <View style={dynamicStyles.filterSection}>
                  <Text style={dynamicStyles.sectionTitle}>{t.filters.paymentType}</Text>
                  <TouchableOpacity 
                    style={dynamicStyles.dropdownButton}
                    onPress={() => toggleDropdown('payments')}
                  >
                    <Text style={dynamicStyles.dropdownButtonText}>{tempPayment}</Text>
                    <Ionicons 
                      name={showPayments ? "chevron-up" : "chevron-down"} 
                      size={24} 
                      color={isDarkMode ? "#E5E7EB" : "#444"} 
                    />
                  </TouchableOpacity>
                  
                  {/* Ödeme türü dropdown listesi */}
                  {showPayments && (
                    <View style={dynamicStyles.dropdownList}>
                      <ScrollView 
                        style={{ maxHeight: 200 }}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {paymentTypes.map((type, index) => (
                          <TouchableOpacity 
                            key={index}
                            style={[
                              dynamicStyles.dropdownItem,
                              tempPayment === type && dynamicStyles.selectedDropdownItem
                            ]}
                            onPress={() => {
                              setTempPayment(type);
                              setShowPayments(false);
                            }}
                          >
                            <Text style={[
                              dynamicStyles.dropdownItemText,
                              tempPayment === type && dynamicStyles.selectedDropdownItemText
                            ]}>{type}</Text>
                            
                            {tempPayment === type && (
                              <Ionicons name="checkmark" size={20} color={isDarkMode ? "#818CF8" : "#4F46E5"} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Belge türü seçimi */}
                <View style={dynamicStyles.filterSection}>
                  <Text style={dynamicStyles.sectionTitle}>{t.filters.documentType}</Text>
                  <TouchableOpacity 
                    style={dynamicStyles.dropdownButton}
                    onPress={() => toggleDropdown('documents')}
                  >
                    <Text style={dynamicStyles.dropdownButtonText}>{tempDocument}</Text>
                    <Ionicons 
                      name={showDocuments ? "chevron-up" : "chevron-down"} 
                      size={24} 
                      color={isDarkMode ? "#E5E7EB" : "#444"} 
                    />
                  </TouchableOpacity>
                  
                  {/* Belge türü dropdown listesi */}
                  {showDocuments && (
                    <View style={dynamicStyles.dropdownList}>
                      <ScrollView 
                        style={{ maxHeight: 200 }}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {documentTypes.map((type, index) => (
                          <TouchableOpacity 
                            key={index}
                            style={[
                              dynamicStyles.dropdownItem,
                              tempDocument === type && dynamicStyles.selectedDropdownItem
                            ]}
                            onPress={() => {
                              setTempDocument(type);
                              setShowDocuments(false);
                            }}
                          >
                            <Text style={[
                              dynamicStyles.dropdownItemText,
                              tempDocument === type && dynamicStyles.selectedDropdownItemText
                            ]}>{type}</Text>
                            
                            {tempDocument === type && (
                              <Ionicons name="checkmark" size={20} color={isDarkMode ? "#818CF8" : "#4F46E5"} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Kateqoriya seçimi */}
                <View style={dynamicStyles.filterSection}>
                  <Text style={dynamicStyles.sectionTitle}>Kateqoriya</Text>
                  <TouchableOpacity
                    style={dynamicStyles.dropdownButton}
                    onPress={() => toggleDropdown('categories')}
                  >
                    <Text style={dynamicStyles.dropdownButtonText}>{tempCategory}</Text>
                    <Ionicons
                      name={showCategories ? "chevron-up" : "chevron-down"}
                      size={24}
                      color={isDarkMode ? "#E5E7EB" : "#444"}
                    />
                  </TouchableOpacity>

                  {/* Kateqoriya Dropdown listesi */}
                  {showCategories && (
                    <View style={dynamicStyles.dropdownList}>
                      <ScrollView
                        style={{ maxHeight: 300 }}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {/* Hamısı seçimi */}
                        <TouchableOpacity
                          style={[
                            dynamicStyles.dropdownItem,
                            tempCategory === "Hamısı" && dynamicStyles.selectedDropdownItem
                          ]}
                          onPress={() => {
                            setTempCategory("Hamısı");
                            setShowCategories(false);
                          }}
                        >
                          <Text style={[
                            dynamicStyles.dropdownItemText,
                            tempCategory === "Hamısı" && dynamicStyles.selectedDropdownItemText
                          ]}>Hamısı</Text>

                          {tempCategory === "Hamısı" && (
                            <Ionicons name="checkmark" size={20} color={isDarkMode ? "#818CF8" : "#4F46E5"} />
                          )}
                        </TouchableOpacity>

                        {/* Əyləncə kateqoriyası - seçilə bilən */}
                        <TouchableOpacity
                          style={[
                            dynamicStyles.dropdownItem,
                            { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' },
                            tempCategory === "Əyləncə" && dynamicStyles.selectedDropdownItem
                          ]}
                          onPress={() => {
                            setTempCategory("Əyləncə");
                            setShowCategories(false);
                          }}
                        >
                          <Text style={[
                            { fontWeight: 'bold', color: isDarkMode ? '#E5E7EB' : '#1F2937' },
                            tempCategory === "Əyləncə" && dynamicStyles.selectedDropdownItemText
                          ]}>Əyləncə</Text>
                          {tempCategory === "Əyləncə" && (
                            <Ionicons name="checkmark" size={20} color={isDarkMode ? "#818CF8" : "#4F46E5"} />
                          )}
                        </TouchableOpacity>
                        {categories["Əyləncə"].map((category, index) => (
                          <TouchableOpacity
                            key={`eylence-${index}`}
                            style={[
                              dynamicStyles.dropdownItem,
                              { paddingLeft: 32 },
                              tempCategory === category && dynamicStyles.selectedDropdownItem
                            ]}
                            onPress={() => {
                              setTempCategory(category);
                              setShowCategories(false);
                            }}
                          >
                            <Text style={[
                              dynamicStyles.dropdownItemText,
                              tempCategory === category && dynamicStyles.selectedDropdownItemText
                            ]}>{category}</Text>

                            {tempCategory === category && (
                              <Ionicons name="checkmark" size={20} color={isDarkMode ? "#818CF8" : "#4F46E5"} />
                            )}
                          </TouchableOpacity>
                        ))}

                        {/* Karyera kateqoriyası - seçilə bilən */}
                        <TouchableOpacity
                          style={[
                            dynamicStyles.dropdownItem,
                            { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' },
                            tempCategory === "Karyera" && dynamicStyles.selectedDropdownItem
                          ]}
                          onPress={() => {
                            setTempCategory("Karyera");
                            setShowCategories(false);
                          }}
                        >
                          <Text style={[
                            { fontWeight: 'bold', color: isDarkMode ? '#E5E7EB' : '#1F2937' },
                            tempCategory === "Karyera" && dynamicStyles.selectedDropdownItemText
                          ]}>Karyera</Text>
                          {tempCategory === "Karyera" && (
                            <Ionicons name="checkmark" size={20} color={isDarkMode ? "#818CF8" : "#4F46E5"} />
                          )}
                        </TouchableOpacity>
                        {categories["Karyera"].map((category, index) => (
                          <TouchableOpacity
                            key={`karyera-${index}`}
                            style={[
                              dynamicStyles.dropdownItem,
                              { paddingLeft: 32 },
                              tempCategory === category && dynamicStyles.selectedDropdownItem
                            ]}
                            onPress={() => {
                              setTempCategory(category);
                              setShowCategories(false);
                            }}
                          >
                            <Text style={[
                              dynamicStyles.dropdownItemText,
                              tempCategory === category && dynamicStyles.selectedDropdownItemText
                            ]}>{category}</Text>

                            {tempCategory === category && (
                              <Ionicons name="checkmark" size={20} color={isDarkMode ? "#818CF8" : "#4F46E5"} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Dropdownlar için ekstra boşluk */}
                <View style={{ height: 80 }} />
              </ScrollView>
              
              {/* Uygula butonu */}
              <View style={dynamicStyles.footer}>
                <TouchableOpacity 
                  style={styles.applyButton} 
                  onPress={applyFilters}
                >
                  <Text style={styles.applyButtonText}>{t.filters.apply}</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Animated.View>
        )}
      </View>
    </ModalContext.Provider>
  );
};

export const useGlobalModal = () => useContext(ModalContext);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  filterPage: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    backgroundColor: 'transparent',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  resetButton: {
    padding: 8,
    width: 60,
    alignItems: 'flex-end',
  },
  spacer: {
    width: 60,
  },
  filterContent: {
    flex: 1,
  },
  filterContentContainer: {
    padding: 16,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  applyButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 