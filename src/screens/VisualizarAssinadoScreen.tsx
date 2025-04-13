import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Text } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/StackNavigator';

export default function VisualizarAssinadoScreen() {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { pdfUrl, nomeArquivo } = route.params as { pdfUrl: string; nomeArquivo: string };

  return (
    <View style={styles.container}>
      <Image source={{ uri: pdfUrl }} style={styles.imagem} resizeMode="contain" />
      <TouchableOpacity
        style={styles.botao}
        onPress={() => navigation.goBack()}>
        <Text style={styles.botaoTexto}>Voltar ao Resultado</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  imagem: { flex: 1, width: '100%', height: '100%' },
  botao: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  botaoTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
