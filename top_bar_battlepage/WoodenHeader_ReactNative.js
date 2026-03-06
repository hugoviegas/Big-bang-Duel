// WoodenHeader.js — React Native (Expo)
import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

// Proporções originais do asset (1600x879)
const ORIG_W   = 1600;
const ORIG_H   = 879;
const CORNER_W = 144;   // slice X
const TOP_H    = 105;   // slice Y topo
const BOT_H    = 194;   // slice Y fundo

// Escala proporcional à tela
const SCALE   = SCREEN_W / ORIG_W;
const cW      = CORNER_W * SCALE;
const topH    = TOP_H    * SCALE;
const botH    = BOT_H    * SCALE;
const midH    = (ORIG_H - TOP_H - BOT_H) * SCALE;

const WoodenHeader = () => (
  <View style={{ width: '100%' }}>
    {/* ROW 1 — Topo */}
    <View style={styles.row}>
      <Image source={require('./assets/9slice/corner_TL.png')}
             style={{ width: cW, height: topH }} resizeMode="stretch" />
      <Image source={require('./assets/9slice/edge_top.png')}
             style={{ flex: 1, height: topH }} resizeMode="stretch" />
      <Image source={require('./assets/9slice/corner_TR.png')}
             style={{ width: cW, height: topH }} resizeMode="stretch" />
    </View>

    {/* ROW 2 — Centro (aqui entram os personagens) */}
    <View style={styles.row}>
      <Image source={require('./assets/9slice/edge_left.png')}
             style={{ width: cW, height: midH }} resizeMode="stretch" />
      <View style={{ flex: 1, height: midH }}>
        {/* Seu conteúdo aqui: personagens, VS, etc */}
      </View>
      <Image source={require('./assets/9slice/edge_right.png')}
             style={{ width: cW, height: midH }} resizeMode="stretch" />
    </View>

    {/* ROW 3 — Fundo com corda */}
    <View style={styles.row}>
      <Image source={require('./assets/9slice/corner_BL.png')}
             style={{ width: cW, height: botH }} resizeMode="stretch" />
      <Image source={require('./assets/9slice/edge_bottom.png')}
             style={{ flex: 1, height: botH }} resizeMode="stretch" />
      <Image source={require('./assets/9slice/corner_BR.png')}
             style={{ width: cW, height: botH }} resizeMode="stretch" />
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' }
});

export default WoodenHeader;
