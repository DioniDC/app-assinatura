import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function VisualizarImagemScreen() {
  const { params } = useRoute<any>();
  const navigation = useNavigation();
  const { imagemBase64 } = params;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.botaoFechar}>
        <Text style={styles.textoFechar}>✖ Fechar</Text>
      </TouchableOpacity>
      <Image source={{ uri: imagemBase64 }} style={styles.imagem} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  imagem: { width: '100%', height: '100%' },
  botaoFechar: { position: 'absolute', top: 40, right: 20, zIndex: 2 },
  textoFechar: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
