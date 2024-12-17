//Para publicar: eas build -p android --profile preview

import React, { useState, useEffect } from 'react';
import { Button, ActivityIndicator, View, Alert, StyleSheet, Modal, TouchableOpacity, Text, FlatList, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

//Estados para almacenar información
export default function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [collections, setCollections] = useState([]);
  const [selectedCollectionName, setSelectedCollectionName] = useState('Todas');
  const [modalVisible, setModalVisible] = useState(false);
  const [personDetails, setPersonDetails] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [faceImages, setFaceImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  //Llamada a las funciones iniciales
  useEffect(() => {
    fetchCollections();
    //setSelectedCollectionName('Todas');
    fetchFaces();
  }, [selectedCollectionName]);

  const fetchCollections = async () => {
    const url = "https://api.luxand.cloud/collection";
    const headers = {
      "token": "78bc046c5f354f8282045f39bd631f14",
    };

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: headers
      });
      const data = await response.json();
      const updatedCollections = [{ name: 'Todas', uuid: 'all' }, ...data];
      setCollections(updatedCollections);
      /*if (data && data.length > 0) {
        setSelectedCollectionName('Todas');
      }*/
    } catch (error) {
      console.error('Error al obtener las colecciones:', error);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Lo siento, necesitamos permisos para acceder a tu cámara!');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets) {
      const imageUri = result.assets[0].uri;
      setSelectedImage(imageUri);
      /*Alert.alert('Foto Tomada Correctamente');*/
    }
  };

  const pickImage = async () => {
    // Pedir permiso para acceder a la galería de fotos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Lo siento, necesitamos permisos de galería para hacer esto!');
      return;
    }

    // Permitir al usuario elegir una imagen de su galería
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      //aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets) {
      const imageUri_2 = result.assets[0].uri;
      setSelectedImage(imageUri_2);
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      Alert.alert('Por favor, toma una foto primero');
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append('photo', {
      uri: selectedImage,
      type: 'image/jpg',
      name: 'photo.jpg',
    });
    if (selectedCollectionName !== 'Todas') {
      formData.append('collections', selectedCollectionName);
    }

    const url = "https://api.luxand.cloud/photo/search/v2";
    const headers = {
      "token": "78bc046c5f354f8282045f39bd631f14",
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: formData,
      });
      const data = await response.json();

      if (data && data.length > 0) {
        const firstMatch = data[0];
        console.log(firstMatch);
        const name = firstMatch.name;
        const probability = firstMatch.probability;
        const collectionsName = firstMatch.collections[0].name;

        await fetchPersonDetails(firstMatch.uuid);
        
        const message = `Nombre: ${name}\nProbabilidad: ${(probability*100).toFixed(2)}%\nColección: ${collectionsName}`;
        Alert.alert('Resultado', message);
      } else {
        Alert.alert('Resultado', 'No se encontraron coincidencias');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error al enviar la foto:', error);
      Alert.alert('Error', 'Ocurrió un error al enviar la foto');
      setIsLoading(false);
    }
    setIsLoading(false);
  };

  const fetchPersonDetails = async (uuid) => {
    const url = `https://api.luxand.cloud/v2/person/${uuid}`;
    const headers = {
      "token": "78bc046c5f354f8282045f39bd631f14",
    };

    try {
      const response = await fetch(url, { method: "GET", headers: headers });
      const data = await response.json();
      setPersonDetails(data);
    } catch (error) {
      console.error('Error al obtener detalles de la persona:', error);
    }
    setSelectedImage(null);
  };

  const renderCollectionItem = ({ item }) => (
    <TouchableOpacity
      style={styles.collectionItem}
      onPress={() => {
        setIsLoading(true);
        setSelectedCollectionName(item.name);
        setModalVisible(false);
        setIsLoading(false);
      }}
    >
      <Text style={styles.collectionItemText}>{item.name}</Text>
    </TouchableOpacity>
  );

  const handleCompare = async () => {
    if (!selectedImage || faceImages.length === 0) {
      Alert.alert('Error', 'No hay imagen seleccionada o no hay imágenes en la base de datos para comparar.');
      return;
    }

    setIsLoading(true);

    //Cambio el formato de la imagen porque la API necesita ese formato en face1(en este caso)
    const selectedImageBase64 = await FileSystem.readAsStringAsync(selectedImage, { encoding: FileSystem.EncodingType.Base64 });
  
    let comparisonResults = [];
  
    for (let i = 0; i < faceImages.length; i++) {
      const person = faceImages[i];

      console.log(person);
    
      // Supongamos que `faceImages` contiene objetos con `url` y `name`

      const formData = new FormData();
        formData.append("face1", selectedImageBase64);
        formData.append('face2', person.url);
        formData.append('threshold', '0.8');
  
      try {
        const response = await fetch("https://api.luxand.cloud/photo/similarity", {
          method: "POST",
          headers: { "token": "78bc046c5f354f8282045f39bd631f14"},
          body: formData
        });
        const data = await response.json();
        console.log(data);
        //Actualmente no filtra los que superan el umbral. Descomentar data.similar para filtrar
        if (data /*&& data.similar*/) {
          comparisonResults.push({ name: person.name, score: data.score });
        }
      } catch (error) {
        console.error('An error occurred:', error);
        setIsLoading(false);
      }
    }
    console.log(comparisonResults);

    // Ordenar los resultados por score de mayor a menor
    comparisonResults.sort((a, b) => {
      // Trata NaN como el valor más bajo posible
      if (isNaN(a.score)) return 1; // Mueve a hacia abajo en la lista
      if (isNaN(b.score)) return -1; // Mueve b hacia abajo en la lista
      return b.score - a.score;
    });
    

    //Me quedo con los 5 primeros
    const firstFiveResults = comparisonResults.slice(0, 5);

    

    // Preparar y mostrar los resultados al usuario. "map" es una función de vector a vector, donde cada componente se transforma
    const resultsMessage = firstFiveResults.map((result, index) => `${index + 1}. ${result.name} - Score: ${(result.score*100).toFixed(2)}%`).join('\n');
    console.log(resultsMessage);
    Alert.alert('Resultados de Comparación', resultsMessage);

    setIsLoading(false);
    setSelectedImage(null);
  };

  const fetchFaces = async () => {
    const url = "https://api.luxand.cloud/v2/person";
    const headers = {
      "token": "78bc046c5f354f8282045f39bd631f14",
    };

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: headers
      });
      const data = await response.json();

      const shouldFilterByCollection = selectedCollectionName !== "Todas";

      //Filtro la información solo de la colección seleccionada
      const filteredData = data.filter(person =>
        shouldFilterByCollection ? person.collections.some(collections => collections.name === selectedCollectionName) : true //Si Todas no está seleccionado, filtra. Si no, no lo hagas
      );

      console.log(filteredData);

      const images = filteredData.map(person => {
        // Asegúrate de que cada persona tiene al menos una cara para evitar errores
        /*if (person.faces.length>1){
          Alert.alert('Hay una persona con más de una cara');
        }*/

        if (person.faces && person.faces.length > 0) {
          return {
            url: person.faces[0].url,
            name: person.name, // Asumimos que 'name' está directamente en el objeto de la persona
          };
        }
        return null; // Retorna null para personas sin caras, luego filtraremos estos valores nulos
      }).filter(face => face !== null); // Filtrar los posibles valores nulos
  
      setFaceImages(images); // Actualizar el estado con los objetos de imágenes de las caras
    } catch (error) {
      console.error('Error al obtener las Caras de las Personas:', error);
    }
  };

  const handleFetchandCompare = async () => {
    await fetchCollections();
    await fetchFaces();
    await handleCompare();
     // Se ejecuta después de que fetchFaces haya terminado
  };

  const deletePhoto = async () => {
    const url = `https://api.luxand.cloud/photo/${'6ef2ab51-b4a8-11ee-91bf-0242ac120002'}`;
    const headers = {
      "token": "78bc046c5f354f8282045f39bd631f14",
    };
  
    try {
      const response = await fetch(url, {
        method: "DELETE",
        headers: headers,
      });
      const data = await response.json();
      console.log(data);
      Alert.alert("Foto eliminada", "La foto ha sido eliminada correctamente.");
    } catch (error) {
      console.error('Error al eliminar la foto:', error);
      Alert.alert("Error", "No se pudo eliminar la foto.");
    }
  };
  
//<Button title="Borrar" onPress={deletePhoto} />

  return (
    <View style={styles.container}>
      {isLoading && <ActivityIndicator size="large" color="#0000ff" />}
      <Button title="Hacer Foto" onPress={handleTakePhoto} />
      <Button title="Escoger Foto" onPress={pickImage} />
      <Button title="Verificar Persona" onPress={handleUpload} disabled={!selectedImage} />
      <Button title="Comparar Persona" onPress={handleFetchandCompare} disabled={!selectedImage}/>
      <Button title="Seleccionar Colección" onPress={() => setModalVisible(true)} />
      
      {/* Botón para actualizar caras de momento no necesario. Se hace cada vez que se reinicia la app: 
      <Button title="Actualizar Caras" onPress={fetchFaces} /> */}
      
      <Text>Colección seleccionada: {selectedCollectionName}</Text>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(!modalVisible)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <FlatList
              data={collections}
              renderItem={renderCollectionItem}
              keyExtractor={item => item.uuid}
            />
          </View>
        </View>
      </Modal>

      {personDetails && (
        <Button title="Ver Foto de la Persona" onPress={() => setImageModalVisible(true)} />
      )}

<Modal
  animationType="slide"
  transparent={true}
  visible={imageModalVisible}
  onRequestClose={() => setImageModalVisible(false)}
>
  <View style={styles.centeredView}>
    <View style={styles.modalView}>
      {personDetails && personDetails.faces && personDetails.faces.length > 0 && (
        <Image
          source={{ uri: personDetails.faces[0].url }}
          style={styles.personImage}
          resizeMode="contain"
        />
      )}
      <Button title="Cerrar" onPress={() => setImageModalVisible(false)} />
    </View>
  </View>
</Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    //paddingTop: 300,
  },
  collectionItem: {
    padding: 10,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  collectionItemText: {
    fontSize: 18,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 500
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  personImage: {
    width: 300,
    height: 300,
    marginTop: -300,
  },
});
