import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity,
  TouchableWithoutFeedback, TextInput, Alert, Modal
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/StackNavigator';

export default function StartScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [clickCount, setClickCount] = useState(0);
  const [showConfig, setShowConfig] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  const [apiUrl, setApiUrl] = useState('');
  const [pdv, setPdv] = useState('');
  const [filial, setFilial] = useState('');

  useEffect(() => {
    if (clickCount === 3) {
      setClickCount(0);
      setShowPasswordModal(true);
    }

    const timer = setTimeout(() => setClickCount(0), 1000);
    return () => clearTimeout(timer);
  }, [clickCount]);

  useEffect(() => {
    const carregarDados = async () => {
      const savedUrl = await AsyncStorage.getItem('apiUrl');
      const savedPdv = await AsyncStorage.getItem('pdv');
      const savedFilial = await AsyncStorage.getItem('filial');
      if (savedUrl) setApiUrl(savedUrl);
      if (savedPdv) setPdv(savedPdv);
      if (savedFilial) setFilial(savedFilial);
    };
    carregarDados();
  }, []);

  const validarSenha = () => {
    const dataAtual = new Date();
    const senhaEsperada = `${dataAtual.getFullYear()}${String(dataAtual.getMonth() + 1).padStart(2, '0')}${String(dataAtual.getDate()).padStart(2, '0')}`;

    if (passwordInput === senhaEsperada) {
      setShowConfig(true);
      setShowPasswordModal(false);
      setPasswordInput('');
    } else {
      Alert.alert('Erro', 'Senha incorreta!');
    }
  };

  const salvarConfiguracoes = async () => {
    try {
      await AsyncStorage.setItem('apiUrl', apiUrl);
      await AsyncStorage.setItem('pdv', pdv);
      await AsyncStorage.setItem('filial', filial);
      Alert.alert('Sucesso', 'Configurações salvas com sucesso!');
      setShowConfig(false);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar as configurações');
    }
  };

  const podeIniciar = apiUrl.trim() !== '' && filial.trim() !== '' && pdv.trim() !== '';

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={() => setClickCount(clickCount + 1)}>
         <Image
         source={require('../../assets/logo.png')}
         style={[styles.logo, { backgroundColor: '#e3f2fd' }]}
         />
      </TouchableWithoutFeedback>
      <Text style={styles.title}>Bem-vindo</Text>

      {!showConfig && (
      <TouchableOpacity
        style={[styles.button, !podeIniciar && { backgroundColor: '#aaa' }]}
        onPress={() => {
          if (!podeIniciar) {
            Alert.alert('Configuração obrigatória', 'Preencha todos os parametros para continuar!');
            return;
          }
          navigation.navigate('Home');
        }}
      >
        <Text style={styles.buttonText}>Iniciar</Text>
      </TouchableOpacity>
      )}

      {showConfig && (
        <View style={styles.configContainer}>
          <Text style={styles.configTitle}>Configurações</Text>

          <TextInput
            placeholder="URL da API"
            value={apiUrl}
            onChangeText={setApiUrl}
            style={styles.input}
            autoCapitalize="none"
          />
          <TextInput
            placeholder="PDV"
            value={pdv}
            onChangeText={setPdv}
            style={styles.input}
            keyboardType="numeric"
          />
          <TextInput
            placeholder="Filial"
            value={filial}
            onChangeText={setFilial}
            style={styles.input}
            keyboardType="numeric"
          />

          <TouchableOpacity
            style={[styles.button, { marginTop: 10, backgroundColor: '#4CAF50' }]}
            onPress={salvarConfiguracoes}
          >
            <Text style={styles.buttonText}>Salvar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de senha */}
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Secutiry</Text>
            <TextInput
              value={passwordInput}
              onChangeText={setPasswordInput}
              placeholder=""
              style={styles.input}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.button} onPress={validarSenha}>
              <Text style={styles.buttonText}>Confirmar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#ccc', marginTop: 10 }]}
              onPress={() => {
                setShowPasswordModal(false);
                setPasswordInput('');
              }}
            >
              <Text style={[styles.buttonText, { color: '#333' }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#1976d2',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  configContainer: {
    marginTop: 30,
    width: '100%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
  },
  configTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 40,
    backgroundColor: '#e3f2fd', // <- Aqui
    borderRadius: 100,
  },
});
