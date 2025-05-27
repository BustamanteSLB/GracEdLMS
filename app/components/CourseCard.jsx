import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const CourseCard = ({
  title,
  code,
  section,
  schoolYear,
  adviser,
  details,
  onEdit,
  onAddStudent,
  onDelete,
}) => (
  <View style={styles.card}>
    <View style={styles.avatarWrap}>
      <Text style={styles.avatar}>📚</Text>
    </View>
    <View style={styles.headerRow}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.code}>{code}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.body}>
      <Text><Text style={styles.label}>Section:</Text> {section || <Text style={styles.placeholder}>—</Text>}</Text>
      <Text><Text style={styles.label}>School Year:</Text> {schoolYear || <Text style={styles.placeholder}>—</Text>}</Text>
      <Text><Text style={styles.label}>Adviser:</Text> {adviser || <Text style={styles.placeholder}>—</Text>}</Text>
      {details ? <Text style={styles.details}>{details}</Text> : null}
    </View>
    <View style={styles.actions}>
      <TouchableOpacity style={[styles.btn, styles.edit]} onPress={onEdit}><Text style={styles.btnText}>Edit</Text></TouchableOpacity>
      <TouchableOpacity style={[styles.btn, styles.add]} onPress={onAddStudent}><Text style={styles.btnText}>Add Student</Text></TouchableOpacity>
      <TouchableOpacity style={[styles.btn, styles.delete]} onPress={onDelete}><Text style={styles.btnText}>Delete</Text></TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#504878',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 32,
    elevation: 6,
    padding: 24,
    maxWidth: 370,
    marginVertical: 24,
    marginHorizontal: 'auto',
    borderWidth: 1.5,
    borderColor: '#e3e6f0',
    alignSelf: 'center',
    width: '100%',
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    fontSize: 40,
    backgroundColor: '#ede9fe',
    borderRadius: 27,
    width: 54,
    height: 54,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 54,
    shadowColor: '#6c47ff',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#23235b',
    flex: 1,
  },
  code: {
    backgroundColor: '#ede9fe',
    color: '#6c47ff',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
    overflow: 'hidden',
  },
  divider: {
    height: 2,
    backgroundColor: '#ede9fe',
    borderRadius: 2,
    marginVertical: 12,
    width: '100%',
  },
  body: {
    marginBottom: 16,
  },
  label: {
    fontWeight: '700',
    color: '#23235b',
  },
  placeholder: {
    color: '#bbb',
  },
  details: {
    color: '#888',
    fontSize: 15,
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    width: '100%',
    justifyContent: 'space-between',
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  edit: {
    backgroundColor: '#6c47ff',
  },
  add: {
    backgroundColor: '#22c55e',
  },
  delete: {
    backgroundColor: '#ef4444',
  },
});

export default CourseCard; 