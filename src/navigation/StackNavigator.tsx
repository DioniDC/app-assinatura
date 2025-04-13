import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import ComprasScreen from '../screens/ComprasScreen';
import AssinaturaScreen from '../screens/AssinaturaScreen'; 
import StartScreen from '../screens/StartScreen';
import VisualizarAssinadoScreen from '../screens/VisualizarAssinadoScreen';

export type RootStackParamList = {
  Start: undefined;
  Home: undefined;
  Assinatura: { pdfUrl: string; venda: any; nomeArquivo: string, onVoltar?: () => void; };
  Compras: { apenasAssinados?: boolean };
  Assinados: { apenasAssinados?: boolean };
  VisualizarAssinado: { pdfUrl: string; nomeArquivo: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function StackNavigator() {
  return (
    <Stack.Navigator initialRouteName="Start">
      <Stack.Screen name="Start" component={StartScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Assinatura de Vendas' }} />
      <Stack.Screen name="Assinatura" component={AssinaturaScreen} options={{ title: 'Assinar PDF' }} />
      <Stack.Screen name="Compras" component={ComprasScreen} options={{ title: 'Buscar Vendas' }} />
      <Stack.Screen
        name="Assinados"
        component={ComprasScreen}
        initialParams={{ apenasAssinados: true }}
        options={{ title: 'Consultar Assinados' }}
      />
      <Stack.Screen
        name="VisualizarAssinado"
        component={VisualizarAssinadoScreen}
        options={{ title: 'Nota Promissória Assinada' }}
      />
      
    </Stack.Navigator>
  );
}

