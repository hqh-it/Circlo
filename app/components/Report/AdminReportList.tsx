// screens/Admin/AdminReportList.tsx
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../../firebaseConfig';
import Header from '../../components/header_for_detail';
import AdminReportCard from '../Report/AdminReportCard';

interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  description: string;
  level: string;
  images: string[];
  video?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected';
  createdAt: any;
  customReason?: string;
  userName: string;
  reportedUserName: string;
}

const AdminReportList: React.FC = () => {
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'resolved' | 'rejected'>('pending');

  const loadReports = async () => {
    try {
      setLoading(true);
      const reportsQuery = query(
        collection(db, "reports"), 
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(reportsQuery);
      
      const reportsList: Report[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reportsList.push({
          id: doc.id,
          reporterId: data.reporterId,
          reportedUserId: data.reportedUserId,
          reason: data.reason,
          description: data.description,
          level: data.level,
          images: data.images || [],
          video: data.video,
          status: data.status || 'pending',
          createdAt: data.createdAt,
          customReason: data.customReason,
          userName: data.userName,
          reportedUserName: data.reportedUserName
        });
      });
      
      setAllReports(reportsList);
      applyFilter(reportsList, filter);
    } catch (error) {
      console.error("Load reports error:", error);
      alert('Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilter = (reports: Report[], currentFilter: string) => {
    const filtered = reports.filter(report => report.status === currentFilter);
    setFilteredReports(filtered);
  };

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    applyFilter(allReports, filter);
  }, [filter, allReports]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  const handleReportUpdate = () => {
    loadReports();
  };

  const getStatusCount = (status: string) => {
    return allReports.filter(report => report.status === status).length;
  };

  const handleFilterChange = (newFilter: 'pending' | 'resolved' | 'rejected') => {
    setFilter(newFilter);
  };

  const getTabStyle = (tabFilter: string) => {
    if (filter !== tabFilter) return styles.filterTab;
    
    switch (tabFilter) {
      case 'pending':
        return [styles.filterTab, styles.pendingTabActive];
      case 'resolved':
        return [styles.filterTab, styles.resolvedTabActive];
      case 'rejected':
        return [styles.filterTab, styles.rejectedTabActive];
      default:
        return styles.filterTab;
    }
  };

  const getTabTextStyle = (tabFilter: string) => {
    if (filter !== tabFilter) return styles.filterText;
    
    switch (tabFilter) {
      case 'pending':
        return [styles.filterText, styles.pendingTextActive];
      case 'resolved':
        return [styles.filterText, styles.resolvedTextActive];
      case 'rejected':
        return [styles.filterText, styles.rejectedTextActive];
      default:
        return styles.filterText;
    }
  };

  const getBorderColor = (tabFilter: string) => {
    if (filter !== tabFilter) return 'transparent';
    
    switch (tabFilter) {
      case 'pending':
        return '#FFA500';
      case 'resolved':
        return '#00A86B';
      case 'rejected':
        return '#dc3545';
      default:
        return 'transparent';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text>Loading reports...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Report Management" />
      
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          Total Reports: {allReports.length}
        </Text>
        <Text style={styles.counterSubText}>
          {getStatusCount('pending')} pending, {getStatusCount('resolved')} resolved, {getStatusCount('rejected')} rejected
        </Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={getTabStyle('pending')}
          onPress={() => handleFilterChange('pending')}
        >
          <Text style={getTabTextStyle('pending')}>
            Pending ({getStatusCount('pending')})
          </Text>
          <View style={[styles.tabIndicator, { borderBottomColor: getBorderColor('pending') }]} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={getTabStyle('resolved')}
          onPress={() => handleFilterChange('resolved')}
        >
          <Text style={getTabTextStyle('resolved')}>
            Resolved ({getStatusCount('resolved')})
          </Text>
          <View style={[styles.tabIndicator, { borderBottomColor: getBorderColor('resolved') }]} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={getTabStyle('rejected')}
          onPress={() => handleFilterChange('rejected')}
        >
          <Text style={getTabTextStyle('rejected')}>
            Rejected ({getStatusCount('rejected')})
          </Text>
          <View style={[styles.tabIndicator, { borderBottomColor: getBorderColor('rejected') }]} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredReports}
        renderItem={({ item }) => (
          <AdminReportCard 
            report={item} 
            onReportUpdate={handleReportUpdate}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No {filter} reports found
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  counter: {
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  counterText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003B36',
    marginBottom: 4,
  },
  counterSubText: {
    fontSize: 14,
    color: '#666',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: '#f8f9fa',
  },
  pendingTabActive: {
    backgroundColor: '#fffaf0',
  },
  resolvedTabActive: {
    backgroundColor: '#f0fff4',
  },
  rejectedTabActive: {
    backgroundColor: '#fff5f5',
  },
  filterText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  pendingTextActive: {
    color: '#FFA500',
    fontWeight: 'bold',
  },
  resolvedTextActive: {
    color: '#00A86B',
    fontWeight: 'bold',
  },
  rejectedTextActive: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default AdminReportList;